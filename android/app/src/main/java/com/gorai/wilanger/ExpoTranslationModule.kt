package com.gorai.wilanger

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import java.util.LinkedHashMap

class ExpoTranslationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private val modelManager = RemoteModelManager.getInstance()
  private val translatorLock = Any()
  private val translatorCache = object : LinkedHashMap<Pair<String, String>, Translator>(6, 0.75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<Pair<String, String>, Translator>): Boolean {
      if (size > 3) {
        eldest.value.close()
        return true
      }
      return false
    }
  }

  override fun getName(): String = "ExpoTranslationModule"

  override fun getConstants(): MutableMap<String, Any> {
    val map = HashMap<String, Any>()
    map["isAvailable"] = true
    return map
  }

  override fun onCatalystInstanceDestroy() {
    synchronized(translatorLock) {
      translatorCache.values.forEach { it.close() }
      translatorCache.clear()
    }
    super.onCatalystInstanceDestroy()
  }

  @ReactMethod
  fun getAvailableLanguagesAsync(promise: Promise) {
    promise.resolve(Arguments.fromList(TranslateLanguage.getAllLanguages().sorted()))
  }

  @ReactMethod
  fun getDownloadedLanguagePacksAsync(promise: Promise) {
    getDownloadedLanguagesTask().forward(promise, ERROR_MODEL_QUERY) { Arguments.fromList(it) }
  }

  @ReactMethod
  fun isLanguagePackDownloadedAsync(source: String, target: String, promise: Promise) {
    try {
      val src = requireLanguage(source)
      val tgt = requireLanguage(target)
      getDownloadedLanguagesTask().forward(promise, ERROR_MODEL_QUERY) { list -> list.contains(src) && list.contains(tgt) }
    } catch (error: Throwable) {
      promise.reject(ERROR_INVALID_LANGUAGE, error.message, error)
    }
  }

  @ReactMethod
  fun downloadLanguagePackAsync(source: String, target: String, promise: Promise) {
    try {
      val src = requireLanguage(source)
      val tgt = requireLanguage(target)
      Log.d(TAG, "download_start")
      val tasks = mutableListOf<Task<Void>>(downloadModelTask(src))
      if (tgt != src) {
        tasks.add(downloadModelTask(tgt))
      }
      Tasks.whenAll(tasks).addOnSuccessListener {
        Log.d(TAG, "download_success")
        promise.resolve(null)
      }.addOnFailureListener { error ->
        Log.e(TAG, "download_error", error)
        promise.reject(ERROR_MODEL_DOWNLOAD, error.message ?: ERROR_MODEL_DOWNLOAD, error)
      }
    } catch (error: Throwable) {
      Log.e(TAG, "download_invalid", error)
      promise.reject(ERROR_INVALID_LANGUAGE, error.message ?: ERROR_INVALID_LANGUAGE, error)
    }
  }

  @ReactMethod
  fun deleteLanguagePackAsync(source: String, target: String, promise: Promise) {
    try {
      val src = requireLanguage(source)
      val tgt = requireLanguage(target)
      Log.d(TAG, "delete_start")
      val tasks = mutableListOf<Task<Void>>(deleteModelTask(src))
      if (tgt != src) {
        tasks.add(deleteModelTask(tgt))
      }
      Tasks.whenAll(tasks).addOnSuccessListener {
        Log.d(TAG, "delete_success")
        promise.resolve(null)
      }.addOnFailureListener { error ->
        Log.e(TAG, "delete_error", error)
        promise.reject(ERROR_MODEL_DELETE, error.message ?: ERROR_MODEL_DELETE, error)
      }
    } catch (error: Throwable) {
      Log.e(TAG, "delete_invalid", error)
      promise.reject(ERROR_INVALID_LANGUAGE, error.message ?: ERROR_INVALID_LANGUAGE, error)
    }
  }

  @ReactMethod
  fun translateAsync(text: String, source: String, target: String, promise: Promise) {
    val trimmed = text.trim()
    if (trimmed.isEmpty()) {
      promise.resolve("")
      return
    }
    try {
      val src = requireLanguage(source)
      val tgt = requireLanguage(target)
      val translator = obtainTranslator(src, tgt)
      translator.downloadModelIfNeeded().addOnSuccessListener {
        translator.translate(trimmed).addOnSuccessListener { result ->
          promise.resolve(result)
        }.addOnFailureListener { error ->
          promise.reject(ERROR_TRANSLATE, error.message, error)
        }
      }.addOnFailureListener { error ->
        promise.reject(ERROR_MODEL_DOWNLOAD, error.message, error)
      }
    } catch (error: Throwable) {
      promise.reject(ERROR_INVALID_LANGUAGE, error.message, error)
    }
  }

  private fun getDownloadedLanguagesTask(): Task<List<String>> {
    return modelManager.getDownloadedModels(TranslateRemoteModel::class.java).continueWith { task ->
      if (!task.isSuccessful) {
        throw task.exception ?: Exception("Model query failed")
      }
      val result = task.result ?: emptySet()
      result.map { it.language }.distinct().sorted()
    }
  }

  private fun downloadModelTask(language: String): Task<Void> {
    val model = TranslateRemoteModel.Builder(language).build()
    val conditions = DownloadConditions.Builder().build()
    return modelManager.download(model, conditions)
  }

  private fun deleteModelTask(language: String): Task<Void> {
    val model = TranslateRemoteModel.Builder(language).build()
    return modelManager.deleteDownloadedModel(model)
  }

  private fun obtainTranslator(source: String, target: String): Translator {
    val key = Pair(source, target)
    synchronized(translatorLock) {
      translatorCache[key]?.let { return it }
      val options = TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage(target).build()
      val translator = Translation.getClient(options)
      translatorCache[key] = translator
      return translator
    }
  }

  private fun requireLanguage(code: String): String {
    if (code == "auto") {
      throw IllegalArgumentException("Auto language not supported")
    }
    return TranslateLanguage.fromLanguageTag(code) ?: throw IllegalArgumentException("Unsupported language")
  }

  private fun <T, R> Task<T>.forward(promise: Promise, errorCode: String, mapper: (T) -> R) {
    addOnSuccessListener { result ->
      try {
        promise.resolve(mapper(result))
      } catch (error: Throwable) {
        promise.reject(ERROR_UNKNOWN, error.message, error)
      }
    }.addOnFailureListener { error ->
      promise.reject(errorCode, error.message, error)
    }
  }

  companion object {
    private const val ERROR_INVALID_LANGUAGE = "E_INVALID_LANGUAGE"
    private const val ERROR_MODEL_DOWNLOAD = "E_MODEL_DOWNLOAD"
    private const val ERROR_MODEL_DELETE = "E_MODEL_DELETE"
    private const val ERROR_MODEL_QUERY = "E_MODEL_QUERY"
    private const val ERROR_TRANSLATE = "E_TRANSLATE"
    private const val ERROR_UNKNOWN = "E_UNKNOWN"
    private const val TAG = "expo_translation"
  }
}

import { Platform, StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#05060a'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 96,
    paddingTop: 16
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: -1
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  },
  blurContainer: {
    width: '100%'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700'
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8
  },
  searchButton: {
    padding: 8
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 12
  },
  categoryTab: {
    paddingHorizontal: 16,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  categoryTabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  featuredContent: {
    width: '100%',
    height: 520,
    marginBottom: 24,
    position: 'relative'
  },
  featuredWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  featuredImage: {
    width: '100%',
    height: '100%'
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%'
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 32
  },
  featuredLanguages: {
    marginBottom: 16,
    alignItems: 'center'
  },
  languagesText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center'
  },
  featuredParticipants: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
    marginHorizontal: 6,
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  featuredButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8
  },
  featuredButtonPrimary: {
    backgroundColor: '#fff'
  },
  featuredButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)'
  },
  featuredButtonTextPrimary: {
    color: '#05060a',
    fontSize: 16,
    fontWeight: '700'
  },
  featuredButtonTextSecondary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12
  },
  featuredSubtitle: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12
  },
  sectionContainer: {
    marginBottom: 24
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 20,
    marginBottom: 16
  },
  contentList: {
    paddingHorizontal: 20
  },
  contentItem: {
    width: 120,
    marginRight: 14,
    alignItems: 'center'
  },
  contentThumbnail: {
    width: 120,
    aspectRatio: Platform.select({ web: 1, default: 2 / 3 }),
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111'
  },
  contentImage: {
    width: '100%',
    height: '100%'
  },
  contentStatus: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8
  },
  contentName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  contentMeta: {
    color: 'rgba(255, 255, 255, 0.56)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  hoverableView: Platform.select({
    default: {}
  }),
  hoverableViewHovered: Platform.select({
    default: {}
  })
});

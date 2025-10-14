import React, { useContext, useEffect } from 'react';
import { WebRTCContext } from '../store/WebRTCContext';
import { videoCallService } from '../services/VideoCallService';
import { requestOverlayPermission } from '../utils/permissions';

interface Props {
  children: React.ReactNode;
}

const WebRTCInitializer: React.FC<Props> = ({ children }) => {
  const webRTCContext = useContext(WebRTCContext);

  useEffect(() => {
    videoCallService.setWebRTCContext(webRTCContext);
    
    const initPermissions = async () => {
      await requestOverlayPermission();
    };
    
    initPermissions();
  }, [webRTCContext]);

  return <>{children}</>;
};

export default WebRTCInitializer;
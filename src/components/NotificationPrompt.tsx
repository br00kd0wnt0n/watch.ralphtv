import { useState, useEffect } from 'react';
import './notification-prompt.css';

export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      // Show prompt if permission not granted
      if (Notification.permission === 'default') {
        // Wait 3 seconds before showing prompt
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);

      if (result === 'granted') {
        // Show confirmation notification
        new Notification('🔔 Notifications Enabled', {
          body: 'You\'ll be notified when RalphTV goes live!',
          icon: '/icon-192.png'
        });
      }
    }
  };

  if (!('Notification' in window)) {
    return null; // Browser doesn't support notifications
  }

  if (permission === 'granted') {
    return (
      <div className="notification-status enabled">
        <span className="notification-icon">🔔</span>
        <span className="notification-text">Live alerts enabled</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="notification-status denied">
        <span className="notification-icon">🔕</span>
        <span className="notification-text">Notifications blocked</span>
      </div>
    );
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="notification-prompt">
      <div className="notification-prompt-content">
        <div className="notification-prompt-icon">🔔</div>
        <div className="notification-prompt-text">
          <div className="notification-prompt-title">Get notified when live</div>
          <div className="notification-prompt-subtitle">Never miss a stream</div>
        </div>
        <div className="notification-prompt-actions">
          <button
            className="notification-btn notification-btn-primary"
            onClick={requestPermission}
          >
            Enable
          </button>
          <button
            className="notification-btn notification-btn-secondary"
            onClick={() => setShowPrompt(false)}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

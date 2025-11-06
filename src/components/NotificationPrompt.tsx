import { useState, useEffect } from 'react';
import './notification-prompt.css';

interface NotificationPromptProps {
  show: boolean;
}

export default function NotificationPrompt({ show }: NotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setDismissed(true);

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

  // Only show status badges when stream is playing (show is true)
  if (show && permission === 'granted') {
    return (
      <div className="notification-status enabled">
        <span className="notification-icon">🔔</span>
        <span className="notification-text">Live alerts enabled</span>
      </div>
    );
  }

  if (show && permission === 'denied') {
    return (
      <div className="notification-status denied">
        <span className="notification-icon">🔕</span>
        <span className="notification-text">Notifications blocked</span>
      </div>
    );
  }

  // Only show prompt if explicitly told to show, permission is default, and not dismissed
  if (!show || permission !== 'default' || dismissed) {
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
            onClick={() => setDismissed(true)}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

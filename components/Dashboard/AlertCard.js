// components/Dashboard/AlertCard.js
import React from 'react';
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

const AlertCard = ({ type = "success", title, message, icon: CustomIcon, onAction, actionText }) => {
  const getAlertStyles = (type) => {
    switch(type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          title: 'text-green-800',
          message: 'text-green-700',
          icon: 'text-green-600',
          defaultIcon: CheckCircle
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200', 
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          icon: 'text-yellow-600',
          defaultIcon: AlertCircle
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          title: 'text-blue-800', 
          message: 'text-blue-700',
          icon: 'text-blue-600',
          defaultIcon: Clock
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          title: 'text-red-800',
          message: 'text-red-700', 
          icon: 'text-red-600',
          defaultIcon: XCircle
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          title: 'text-gray-800',
          message: 'text-gray-700',
          icon: 'text-gray-600',
          defaultIcon: AlertCircle
        };
    }
  };

  const styles = getAlertStyles(type);
  const IconComponent = CustomIcon || styles.defaultIcon;

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4`}>
      <div className="flex items-start space-x-3">
        <IconComponent size={20} className={styles.icon} />
        <div className="flex-1">
          <h3 className={`font-medium ${styles.title} mb-1`}>{title}</h3>
          <p className={`text-sm ${styles.message}`}>{message}</p>
          {onAction && actionText && (
            <button 
              onClick={onAction}
              className={`mt-3 text-sm font-medium ${styles.title} hover:underline`}
            >
              {actionText} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;

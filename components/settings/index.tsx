// components/settings/index.tsx - COMPLETELY FIXED
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

// Type for icon names - FIXED
type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface SettingsItemProps {
  title: string;
  description?: string;
  icon?: IconName; // FIXED: Use IconName type
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
  disabled?: boolean;
  hideBorder?: boolean;
}

export function SettingsItem({
  title,
  description,
  icon,
  value,
  onPress,
  showChevron = true,
  toggle = false,
  toggleValue = false,
  onToggle,
  danger = false,
  disabled = false,
  hideBorder = false,
}: SettingsItemProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  const handleToggle = (newValue: boolean) => {
    if (!disabled && onToggle) {
      onToggle(newValue);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.item,
        hideBorder && styles.noBorder,
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled || toggle}
      activeOpacity={disabled ? 1 : 0.7}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={22}
          color={danger ? '#ff3b30' : disabled ? '#ccc' : '#666'}
          style={styles.icon}
        />
      )}
      
      <View style={styles.content}>
        <Text style={[styles.title, danger && styles.dangerTitle]}>
          {title}
        </Text>
        {description && (
          <Text style={[styles.description, disabled && styles.disabledText]}>
            {description}
          </Text>
        )}
        {value && !description && (
          <Text style={[styles.value, disabled && styles.disabledText]}>
            {value}
          </Text>
        )}
      </View>
      
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={handleToggle}
          disabled={disabled}
        />
      ) : showChevron && (
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={danger ? '#ff3b30' : disabled ? '#ccc' : '#999'} 
        />
      )}
    </TouchableOpacity>
  );
}

export interface SettingsGroupProps {
  title: string;
  children: React.ReactNode;
  description?: string;
}

export function SettingsGroup({ title, children, description }: SettingsGroupProps) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{title}</Text>
        {description && (
          <Text style={styles.groupDescription}>{description}</Text>
        )}
      </View>
      <View style={styles.groupContent}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 20,
  },
  groupHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupDescription: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  groupContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 56,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: 12,
    width: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    lineHeight: 20,
  },
  dangerTitle: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    lineHeight: 16,
  },
  value: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontWeight: '400',
  },
  disabledText: {
    color: '#999',
  },
});
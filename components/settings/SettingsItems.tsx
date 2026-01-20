// components/settings/SettingsItem.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export interface SettingsItemProps {
  // Required
  title: string;
  
  // Optional
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value?: string;
  onPress?: () => void;
  
  // Display options
  showChevron?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
  selected?: boolean;
  radio?: boolean;
  disabled?: boolean;
  hideBorder?: boolean;
  loading?: boolean;
  
  // Style options
  iconColor?: string;
  textColor?: string;
  backgroundColor?: string;
  
  // Accessibility
  testID?: string;
  accessibilityLabel?: string;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
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
  selected = false,
  radio = false,
  disabled = false,
  hideBorder = false,
  loading = false,
  iconColor,
  textColor,
  backgroundColor,
  testID,
  accessibilityLabel,
}) => {
  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  const handleToggle = (newValue: boolean) => {
    if (!disabled && !loading && onToggle) {
      onToggle(newValue);
    }
  };

  // Determine colors
  const resolvedIconColor = iconColor || 
    (danger ? '#ff3b30' : 
     disabled ? '#ccc' : 
     '#666');
  
  const resolvedTextColor = textColor || 
    (danger ? '#ff3b30' : 
     disabled ? '#999' : 
     '#000');
  
  const resolvedDescriptionColor = disabled ? '#999' : '#666';
  const resolvedValueColor = disabled ? '#999' : '#666';

  return (
    <TouchableOpacity
      style={[
        styles.item,
        backgroundColor && { backgroundColor },
        hideBorder && styles.noBorder,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled || loading || toggle}
      activeOpacity={disabled || loading ? 1 : 0.7}
      testID={testID}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {/* Left Icon or Radio Button */}
      <View style={styles.leftContainer}>
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : radio ? (
          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={selected ? '#007AFF' : '#ccc'}
            style={styles.radioIcon}
          />
        ) : icon ? (
          <Ionicons
            name={icon}
            size={22}
            color={resolvedIconColor}
            style={styles.icon}
          />
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text 
          style={[
            styles.title,
            { color: resolvedTextColor },
            danger && styles.dangerTitle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        
        {description && (
          <Text 
            style={[
              styles.description,
              { color: resolvedDescriptionColor },
            ]}
            numberOfLines={2}
          >
            {description}
          </Text>
        )}
        
        {value && !description && (
          <Text 
            style={[
              styles.value,
              { color: resolvedValueColor },
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>
        )}
      </View>

      {/* Right Side: Toggle, Chevron, or Indicator */}
      <View style={styles.rightContainer}>
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={handleToggle}
            disabled={disabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={toggleValue ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        ) : showChevron && !radio && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={danger ? '#ff3b30' : disabled ? '#ccc' : '#999'} 
          />
        )}
        
        {/* Selected indicator for non-radio items */}
        {selected && !radio && !toggle && !showChevron && (
          <Ionicons 
            name="checkmark" 
            size={20} 
            color="#007AFF" 
            style={styles.checkmark}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export interface SettingsGroupProps {
  title: string;
  children: React.ReactNode;
  description?: string;
  showDivider?: boolean;
  compact?: boolean;
  testID?: string;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({ 
  title, 
  children, 
  description,
  showDivider = true,
  compact = false,
  testID 
}) => {
  return (
    <View style={styles.group} testID={testID}>
      <View style={[styles.groupHeader, compact && styles.compactGroupHeader]}>
        <Text style={styles.groupTitle}>{title}</Text>
        {description && (
          <Text style={styles.groupDescription}>{description}</Text>
        )}
      </View>
      <View style={[styles.groupContent, !showDivider && styles.noDivider]}>
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child;
          
          // Type guard to ensure child is a React element with props
          const element = child as React.ReactElement<SettingsItemProps>;
          
          // Add hideBorder to all but last child if showDivider is true
          const isLast = index === React.Children.count(children) - 1;
          return React.cloneElement(element, {
            ...element.props,
            hideBorder: !showDivider || isLast,
          });
        })}
      </View>
    </View>
  );
};

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  compact?: boolean;
  padded?: boolean;
  backgroundColor?: string;
  testID?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ 
  title, 
  description, 
  children, 
  compact = false,
  padded = true,
  backgroundColor = 'white',
  testID 
}) => {
  return (
    <View 
      style={[
        styles.section, 
        compact && styles.compactSection,
        { backgroundColor },
        !padded && styles.noPadding,
      ]} 
      testID={testID}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && (
        <Text style={styles.sectionDescription}>{description}</Text>
      )}
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
};

export interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  backgroundColor?: string;
  testID?: string;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconColor = '#007AFF',
  backgroundColor = 'white',
  testID,
}) => {
  return (
    <View style={[styles.header, { backgroundColor }]} testID={testID}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={48} 
          color={iconColor} 
          style={styles.headerIcon}
        />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && (
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      )}
    </View>
  );
};

export interface SettingsFooterProps {
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  backgroundColor?: string;
  testID?: string;
}

export const SettingsFooter: React.FC<SettingsFooterProps> = ({
  text,
  icon,
  iconColor = '#666',
  backgroundColor = '#f8f8f8',
  testID,
}) => {
  return (
    <View style={[styles.footer, { backgroundColor }]} testID={testID}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={16} 
          color={iconColor} 
          style={styles.footerIcon}
        />
      )}
      <Text style={styles.footerText}>{text}</Text>
    </View>
  );
};

// Helper component for inline form items
export interface SettingsFormItemProps {
  label: string;
  value?: string;
  placeholder?: string;
  editable?: boolean;
  onChangeText?: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  testID?: string;
}

export const SettingsFormItem: React.FC<SettingsFormItemProps> = ({
  label,
  value,
  placeholder,
  editable = true,
  onChangeText,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'none',
  testID,
}) => {
  return (
    <View style={styles.formItem} testID={testID}>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={styles.formInputContainer}>
        <Text style={styles.formValue}>
          {value || placeholder}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Item Styles
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
    minHeight: 56,
    backgroundColor: 'white',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  
  // Left Container
  leftContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    // Icon styling is handled by Ionicons
  },
  radioIcon: {
    // Radio button styling
  },
  
  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  dangerTitle: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 16,
  },
  value: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '400',
  },
  
  // Right Container
  rightContainer: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    marginLeft: 4,
  },
  
  // Group Styles
  group: {
    marginBottom: 20,
  },
  groupHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  compactGroupHeader: {
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
  noDivider: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  
  // Section Styles
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  compactSection: {
    padding: 16,
  },
  noPadding: {
    padding: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionContent: {
    // Content styling
  },
  
  // Header Styles
  header: {
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Footer Styles
  footer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  footerIcon: {
    marginRight: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    flex: 1,
  },
  
  // Form Item Styles
  formItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  formInputContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  formValue: {
    fontSize: 16,
    color: '#000',
  },
});
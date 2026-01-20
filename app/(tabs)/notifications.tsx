import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NotificationType = {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'follow_back';
  user: string;
  userHandle: string;
  action: string;
  time: string;
  isRead: boolean;
  postId?: string;
};

export default function NotificationsScreen() {
  const notifications: NotificationType[] = [
    {
      id: '1',
      type: 'like',
      user: 'Valerie Azer',
      userHandle: '@valerieazr90',
      action: 'liked your comment',
      time: '3hr ago',
      isRead: false,
    },
    {
      id: '2',
      type: 'like',
      user: 'Arlan',
      userHandle: '@arlamgn',
      action: 'liked your post',
      time: '3hr ago',
      isRead: false,
    },
    {
      id: '3',
      type: 'follow_back',
      user: 'Lolita Horan',
      userHandle: '@lolitahoran',
      action: 'followed you back!',
      time: '2hr ago',
      isRead: true,
    },
    {
      id: '4',
      type: 'mention',
      user: 'Skye',
      userHandle: '@skyedsn',
      action: 'mentioned you in a comment',
      time: '2hr ago',
      isRead: false,
    },
    {
      id: '5',
      type: 'mention',
      user: 'Laila Gib',
      userHandle: '@lailagibs',
      action: 'do you wanna hang out this...',
      time: '2hr ago',
      isRead: true,
    },
    {
      id: '6',
      type: 'like',
      user: 'Harry Malks',
      userHandle: '@harrymalks',
      action: 'liked your post',
      time: '3hr ago',
      isRead: true,
    },
    {
      id: '7',
      type: 'follow_back',
      user: 'Jolina Angine',
      userHandle: '@jolinaangine',
      action: 'followed you back!',
      time: 'Yesterday',
      isRead: true,
    },
    {
      id: '8',
      type: 'like',
      user: 'Aiden Blaze',
      userHandle: '@aidenblaze',
      action: 'liked your post',
      time: 'Yesterday',
      isRead: true,
    },
    {
      id: '9',
      type: 'like',
      user: 'Aiden Frost',
      userHandle: '@aidenfrost',
      action: 'liked your comment',
      time: '2 days ago',
      isRead: true,
    },
  ];

  const renderNotification = ({ item }: { item: NotificationType }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'like':
          return <Ionicons name="heart" size={20} color="#ff375f" />;
        case 'comment':
          return <Ionicons name="chatbubble" size={20} color="#007AFF" />;
        case 'follow':
        case 'follow_back':
          return <Ionicons name="person-add" size={20} color="#34C759" />;
        case 'mention':
          return <Ionicons name="at" size={20} color="#FF9500" />;
        default:
          return <Ionicons name="notifications" size={20} color="#007AFF" />;
      }
    };

    return (
      <TouchableOpacity style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification
      ]}>
        <View style={styles.notificationIcon}>
          {getIcon()}
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.userName}>{item.user} </Text>
            {item.action}
          </Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.time}>9:41</Text>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.inviteSection}>
        <Text style={styles.inviteTitle}>Invite Friends</Text>
        <Text style={styles.inviteSubtitle}>Share your link invite</Text>
        <TouchableOpacity style={styles.copyLinkButton}>
          <Text style={styles.copyLinkText}>Copy Link</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Today</Text>
        <FlatList
          data={notifications.filter(n => n.time.includes('hr'))}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.notificationsList}
        />

        <Text style={styles.sectionTitle}>Yesterday</Text>
        <FlatList
          data={notifications.filter(n => n.time.includes('Yesterday'))}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.notificationsList}
        />

        <Text style={styles.sectionTitle}>Older</Text>
        <FlatList
          data={notifications.filter(n => n.time.includes('days'))}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.notificationsList}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  time: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inviteSection: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  inviteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  inviteSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  copyLinkButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  copyLinkText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  notificationsList: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  userName: {
    fontWeight: '600',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
});
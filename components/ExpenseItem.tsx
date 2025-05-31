import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Expense } from './ExpensesContext';

const categoryIcons: { [key: string]: keyof typeof FontAwesome.glyphMap } = {
  food: 'cutlery',
  transport: 'car',
  shopping: 'shopping-bag',
  bills: 'file-text',
  entertainment: 'film',
  other: 'ellipsis-h',
};

interface ExpenseItemProps {
  item: Expense;
  onDelete: () => void;
  onEdit: (item: Expense) => void;
}

export default function ExpenseItem({ item, onDelete, onEdit }: ExpenseItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.expenseItem}>
        <View style={styles.expenseLeft}>
          <View style={styles.iconContainer}>
            <FontAwesome 
              name={categoryIcons[item.category] || 'ellipsis-h'} 
              size={20} 
              color="#4285F4" 
            />
          </View>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseDesc}>{item.description}</Text>
            <Text style={styles.expenseDate}>{item.date}</Text>
          </View>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>₹{item.amount.toLocaleString()}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => onEdit(item)}
            >
              <FontAwesome name="edit" size={16} color="#34A853" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={onDelete}
            >
              <FontAwesome name="trash" size={16} color="#EA4335" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    marginLeft: 12,
    flex: 1,
  },
  expenseDesc: {
    fontSize: 16,
    color: '#333',
  },
  expenseDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButton: {
    borderColor: '#34A853',
    backgroundColor: '#F2F8F4',
  },
  deleteButton: {
    borderColor: '#EA4335',
    backgroundColor: '#FDF2F1',
  },
});
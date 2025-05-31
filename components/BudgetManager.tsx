import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { ExpensesContext, Budget } from './ExpensesContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface CategoryLimit {
  category: string;
  limit: string;
}

export default function BudgetManager() {
  const { budget, setBudget, getBudgetStatus } = useContext(ExpensesContext);
  const [amount, setAmount] = useState(budget?.amount.toString() || '');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(budget?.period || 'monthly');
  const [showCategoryLimits, setShowCategoryLimits] = useState(!!budget?.categoryLimits);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>(
    budget?.categoryLimits
      ? Object.entries(budget.categoryLimits).map(([category, limit]) => ({
          category,
          limit: limit.toString(),
        }))
      : []
  );

  const budgetStatus = getBudgetStatus();

  const handleSave = useCallback(async () => {
    try {
      const budgetAmount = parseFloat(amount);
      if (isNaN(budgetAmount) || budgetAmount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
        return;
      }

      const newBudget: Budget = {
        amount: budgetAmount,
        period,
      };

      if (showCategoryLimits) {
        const limits: { [key: string]: number } = {};
        for (const { category, limit } of categoryLimits) {
          const limitAmount = parseFloat(limit);
          if (!isNaN(limitAmount) && limitAmount > 0) {
            limits[category] = limitAmount;
          }
        }
        if (Object.keys(limits).length > 0) {
          newBudget.categoryLimits = limits;
        }
      }

      await setBudget(newBudget);
      Alert.alert('Success', 'Budget settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save budget settings');
    }
  }, [amount, period, showCategoryLimits, categoryLimits, setBudget]);

  const addCategoryLimit = useCallback(() => {
    setCategoryLimits(prev => [
      ...prev,
      { category: 'food', limit: '' },
    ]);
  }, []);

  const removeCategoryLimit = useCallback((index: number) => {
    setCategoryLimits(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateCategoryLimit = useCallback((index: number, field: 'category' | 'limit', value: string) => {
    setCategoryLimits(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Budget Status</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(100, (budgetStatus.total / (budget?.amount || 1)) * 100)}%`,
                backgroundColor: budgetStatus.isOverBudget ? '#EA4335' : '#34A853',
              }
            ]} 
          />
        </View>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Spent: ₹{budgetStatus.total.toLocaleString()}
          </Text>
          <Text style={styles.progressText}>
            Remaining: ₹{budgetStatus.remaining.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Budget Settings</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Budget Amount</Text>
          <View style={styles.amountInput}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="Enter budget amount"
            />
          </View>
        </View>

        <View style={styles.periodContainer}>
          <Text style={styles.label}>Budget Period</Text>
          <View style={styles.periodButtons}>
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodButton,
                  period === p && styles.selectedPeriod,
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    period === p && styles.selectedPeriodText,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.label}>Category Limits</Text>
          <Switch
            value={showCategoryLimits}
            onValueChange={setShowCategoryLimits}
            trackColor={{ false: '#767577', true: '#4285F4' }}
          />
        </View>

        {showCategoryLimits && (
          <View style={styles.categoryLimitsContainer}>
            {categoryLimits.map((limit, index) => (
              <View key={index} style={styles.categoryLimitItem}>
                <View style={styles.categoryLimitInputs}>
                  <View style={[styles.input, styles.categorySelect]}>
                    <TouchableOpacity
                      style={styles.categoryButton}
                      onPress={() => {
                        const categories = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'other'];
                        const currentIndex = categories.indexOf(limit.category);
                        const nextCategory = categories[(currentIndex + 1) % categories.length];
                        updateCategoryLimit(index, 'category', nextCategory);
                      }}
                    >
                      <Text style={styles.categoryButtonText}>{
                        limit.category.charAt(0).toUpperCase() + limit.category.slice(1)
                      }</Text>
                      <FontAwesome name="chevron-right" size={12} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.amountInput}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      value={limit.limit}
                      onChangeText={(value) => updateCategoryLimit(index, 'limit', value)}
                      keyboardType="decimal-pad"
                      style={[styles.input, styles.limitInput]}
                      placeholder="Limit"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeCategoryLimit(index)}
                >
                  <FontAwesome name="times" size={16} color="#EA4335" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addButton}
              onPress={addCategoryLimit}
            >
              <FontAwesome name="plus" size={16} color="#4285F4" />
              <Text style={styles.addButtonText}>Add Category Limit</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Budget Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34A853',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  periodContainer: {
    marginBottom: 16,
  },
  periodButtons: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedPeriod: {
    backgroundColor: '#4285F4',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedPeriodText: {
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryLimitsContainer: {
    marginTop: 8,
  },
  categoryLimitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLimitInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  categorySelect: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 0,
  },
  categoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#333',
  },
  limitInput: {
    flex: 1,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F8FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: '#4285F4',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

import React, { useContext, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Dimensions, ScrollView, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { ExpensesContext, Expense } from '@/components/ExpensesContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import BudgetManager from '@/components/BudgetManager';

const categories = [
  { id: 'food', name: 'Food', color: '#FF6384' },
  { id: 'transport', name: 'Transport', color: '#36A2EB' },
  { id: 'shopping', name: 'Shopping', color: '#FFCE56' },
  { id: 'bills', name: 'Bills', color: '#4BC0C0' },
  { id: 'entertainment', name: 'Entertainment', color: '#9966FF' },
  { id: 'other', name: 'Other', color: '#FF9F40' },
];

function getChartData(expenses: Expense[], dateFilter: string, startDate: Date | null, endDate: Date | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let startPoint: Date;
  let days: Date[];

  switch (dateFilter) {
    case 'today':
      days = [today];
      break;

    case 'week': {
      startPoint = new Date(today);
      startPoint.setDate(today.getDate() - 6);
      days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startPoint);
        date.setDate(startPoint.getDate() + i);
        return date;
      });
      break;
    }

    case 'month': {
      startPoint = new Date(today);
      startPoint.setDate(today.getDate() - 29);
      days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(startPoint);
        date.setDate(startPoint.getDate() + i);
        return date;
      });
      break;
    }

    case 'custom': {
      if (startDate && endDate) {
        const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        days = Array.from({ length: dayCount }, (_, i) => {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          return date;
        });
      } else {
        days = [today];
      }
      break;
    }

    default: {
      // All time - show last 30 days by default
      startPoint = new Date(today);
      startPoint.setDate(today.getDate() - 29);
      days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(startPoint);
        date.setDate(startPoint.getDate() + i);
        return date;
      });
    }
  }

  // Map days to totals
  const data = days.map(day => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const total = expenses.reduce((sum, expense) => {
      const expenseDate = new Date(expense.timestamp || new Date(expense.date).getTime());
      if (expenseDate >= dayStart && expenseDate <= dayEnd) {
        return sum + expense.amount;
      }
      return sum;
    }, 0);

    return Math.round(total * 100) / 100;
  });

  // Format labels
  const labels = days.map(d => 
    d.toLocaleDateString('en-IN', { 
      month: 'numeric',
      day: 'numeric'
    })
  );

  return { labels, data };
}

function getCategoryData(expenses: Expense[]) {
  // Calculate totals for each category
  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'other';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Map to chart format with correct formatting
  return categories.map(cat => ({
    name: cat.name,
    amount: Math.round((categoryTotals[cat.id] || 0) * 100) / 100,
    color: cat.color,
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
    percentage: categoryTotals[cat.id] 
      ? Math.round((categoryTotals[cat.id] / Object.values(categoryTotals).reduce((a, b) => a + b, 0)) * 100)
      : 0
  }));
}

function getTotalSpent(expenses: Expense[]) {
  return Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
}

function getMoneySavingTip(expenses: Expense[], categoryData: ReturnType<typeof getCategoryData>, dateFilter: string) {
  if (expenses.length === 0) return {
    tip: 'Start tracking your expenses to get personalized saving tips!',
    icon: 'lightbulb-o' as keyof typeof FontAwesome.glyphMap,
  };

  // Calculate total days and daily average
  const totalDays = (() => {
    switch (dateFilter) {
      case 'today':
        return 1;
      case 'week':
        return 7;
      case 'month':
        return 30;
      case 'custom':
        if (expenses.length >= 2) {
          const latestDate = new Date(expenses[expenses.length - 1].timestamp || new Date(expenses[expenses.length - 1].date).getTime());
          const earliestDate = new Date(expenses[0].timestamp || new Date(expenses[0].date).getTime());
          return Math.max(1, Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)));
        }
        return 1;
      default:
        return 30;
    }
  })();

  const total = getTotalSpent(expenses);
  const dailyAverage = total / totalDays;

  // Find highest spending category
  const highestSpendingCategory = categoryData
    .filter(cat => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0];

  // Generate appropriate tip based on spending patterns
  if (highestSpendingCategory && highestSpendingCategory.percentage > 50) {
    return {
      tip: `${highestSpendingCategory.name} makes up ${highestSpendingCategory.percentage}% of your spending. Consider balancing your expenses across categories.`,
      icon: 'warning' as keyof typeof FontAwesome.glyphMap,
    };
  }

  if (dailyAverage > 1000) {
    return {
      tip: `Your daily average spending is ₹${Math.round(dailyAverage).toLocaleString()}. Consider setting a daily budget to reduce expenses.`,
      icon: 'line-chart' as keyof typeof FontAwesome.glyphMap,
    };
  }

  // Calculate recent spending trend
  const recentExpenses = expenses.slice(-3);
  const recentTrend = recentExpenses.length > 0 
    ? recentExpenses.reduce((sum, exp) => sum + exp.amount, 0) / recentExpenses.length 
    : 0;

  if (recentTrend > dailyAverage * 1.5) {
    return {
      tip: 'Your recent spending is higher than your average. Review your recent expenses to identify areas for savings.',
      icon: 'exclamation-triangle' as keyof typeof FontAwesome.glyphMap,
    };
  }

  // Check category distribution
  const categoryCount = categoryData.filter(cat => cat.amount > 0).length;
  if (categoryCount <= 2 && expenses.length > 5) {
    return {
      tip: 'Your expenses are concentrated in very few categories. Diversifying your budget can help better track and control spending.',
      icon: 'pie-chart' as keyof typeof FontAwesome.glyphMap,
    };
  }

  return {
    tip: 'Your spending patterns look well-balanced. Keep tracking your expenses to maintain good financial health!',
    icon: 'check-circle' as keyof typeof FontAwesome.glyphMap,
  };
}

export default function AnalysisScreen() {
  const { expenses, loading, budget, getBudgetStatus } = useContext(ExpensesContext);
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

  const handleDateSelect = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      date.setHours(0, 0, 0, 0);
      
      if (datePickerMode === 'start') {
        // For start date, ensure it's not after today or the end date
        if (endDate && date > endDate) {
          alert('Start date cannot be after end date');
          return;
        }
        if (date > new Date()) {
          alert('Start date cannot be in the future');
          return;
        }
        setStartDate(date);
        if (Platform.OS === 'ios') {
          setDatePickerMode('end');
        } else {
          setTimeout(() => {
            setShowDatePicker(true);
            setDatePickerMode('end');
          }, 500);
        }
      } else {
        // For end date, ensure it's not before start date or after today
        if (startDate && date < startDate) {
          alert('End date cannot be before start date');
          return;
        }
        if (date > new Date()) {
          alert('End date cannot be in the future');
          return;
        }
        setEndDate(date);
        setShowDatePicker(false);
        // Both dates are set, apply the custom filter
        setDateFilter('custom');
      }
    } else {
      setShowDatePicker(false);
    }
  };

  const filterExpenses = useCallback((allExpenses: Expense[]) => {
    if (!allExpenses.length) return allExpenses;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allExpenses.filter(expense => {
      // Create a new Date object from the expense date string
      const expenseDate = new Date(expense.timestamp || new Date(expense.date).getTime());
      expenseDate.setHours(0, 0, 0, 0);

      switch (dateFilter) {
        case 'today':
          return expenseDate.toDateString() === today.toDateString();

        case 'week': {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return expenseDate >= weekAgo && expenseDate <= today;
        }

        case 'month': {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return expenseDate >= monthAgo && expenseDate <= today;
        }

        case 'custom':
          if (!startDate || !endDate) return true;
          return expenseDate >= startDate && expenseDate <= endDate;

        default:
          return true;
      }
    });
  }, [dateFilter, startDate, endDate]);

  // Use React.useMemo for expensive calculations
  const filteredExpenses = useMemo(() => 
    filterExpenses(expenses), [expenses, dateFilter, startDate, endDate]
  );

  const chartData = useMemo(() => 
    getChartData(filteredExpenses, dateFilter, startDate, endDate), 
    [filteredExpenses, dateFilter, startDate, endDate]
  );

  const pieData = useMemo(() => 
    getCategoryData(filteredExpenses).filter(item => item.amount > 0),
    [filteredExpenses]
  );

  const total = useMemo(() => 
    getTotalSpent(filteredExpenses),
    [filteredExpenses]
  );

  const savingTip = useMemo(() => 
    getMoneySavingTip(filteredExpenses, pieData, dateFilter),
    [filteredExpenses, pieData, dateFilter]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (expenses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="bar-chart" size={40} color="#666" />
        <Text style={styles.emptyText}>No expenses to analyze yet</Text>
        <Text style={styles.emptySubtext}>Add some expenses to see analytics</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'all' && styles.filterButtonActive]}
            onPress={() => {
              setDateFilter('all');
              setStartDate(null);
              setEndDate(null);
            }}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'all' && styles.filterButtonTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'today' && styles.filterButtonActive]}
            onPress={() => {
              setDateFilter('today');
              setStartDate(null);
              setEndDate(null);
            }}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'today' && styles.filterButtonTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'week' && styles.filterButtonActive]}
            onPress={() => {
              setDateFilter('week');
              setStartDate(null);
              setEndDate(null);
            }}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'week' && styles.filterButtonTextActive]}>
              Last 7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'month' && styles.filterButtonActive]}
            onPress={() => {
              setDateFilter('month');
              setStartDate(null);
              setEndDate(null);
            }}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'month' && styles.filterButtonTextActive]}>
              Last 30 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'custom' && styles.filterButtonActive]}
            onPress={() => {
              setDateFilter('custom');
              setDatePickerMode('start');
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'custom' && styles.filterButtonTextActive]}>
              Custom Range
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {dateFilter === 'custom' && (
        <TouchableOpacity 
          style={styles.dateRangeContainer}
          onPress={() => {
            setDatePickerMode('start');
            setShowDatePicker(true);
          }}
        >
          <Text style={styles.dateRangeText}>
            {startDate ? startDate.toLocaleDateString() : 'Start Date'} - 
            {endDate ? endDate.toLocaleDateString() : 'End Date'}
          </Text>
        </TouchableOpacity>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? startDate || new Date() : endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleDateSelect}
          maximumDate={new Date()}
          minimumDate={datePickerMode === 'end' ? startDate || undefined : undefined}
        />
      )}

      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>
          {dateFilter === 'today' ? 'Today\'s Spending' :
           dateFilter === 'week' ? 'Last 7 Days Spending' :
           dateFilter === 'month' ? 'Last 30 Days Spending' :
           dateFilter === 'custom' ? 'Custom Period Spending' :
           'Total Spending'}
        </Text>
        <Text style={styles.totalAmount}>₹{total.toLocaleString()}</Text>
        {budget && (
          <Text style={[styles.budgetStatus, { 
            color: total > budget.amount ? '#EA4335' : '#34A853'
          }]}>
            {total > budget.amount 
              ? `₹${(total - budget.amount).toLocaleString()} over budget`
              : `₹${(budget.amount - total).toLocaleString()} under budget`
            }
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spending Trend</Text>
        <BarChart
          data={{
            labels: chartData.labels,
            datasets: [{ data: chartData.data }],
          }}
          width={Dimensions.get('window').width - 32}
          height={220}
          yAxisLabel="₹"
          yAxisSuffix=""
          showValuesOnTopOfBars
          fromZero
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            formatYLabel: (value) => Number(value).toLocaleString(),
            formatTopBarValue: (value) => `₹${Number(value).toLocaleString()}`
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category Distribution</Text>
        {pieData.length > 0 ? (
          <View>
            <PieChart
              data={pieData}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              hasLegend
              avoidFalseZero
              center={[Dimensions.get('window').width / 4, 0]}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
            {pieData.map((item, index) => (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                  <View>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <Text style={styles.categoryPercentage}>{item.percentage}% of total</Text>
                  </View>
                </View>
                <Text style={styles.categoryAmount}>₹{item.amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <FontAwesome name="pie-chart" size={40} color="#666" />
            <Text style={styles.noDataText}>No category data available</Text>
          </View>
        )}
      </View>

      <View style={[styles.card, styles.tipCard]}>
        <View style={styles.tipHeader}>
          <FontAwesome name={savingTip.icon} size={24} color="#4285F4" />
          <Text style={styles.tipTitle}>Savings Tip</Text>
        </View>
        <Text style={styles.tipText}>{savingTip.tip}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#4285F4',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  dateRangeContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateRangeText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  categoryAmount: {
    fontSize: 16,
    color: '#666',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: '#E8F0FE',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  budgetStatus: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  }
});

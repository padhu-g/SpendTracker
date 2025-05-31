import React, { useState, useContext, useRef, memo } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Keyboard,
  View,
  Text,
  Modal,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ExpensesContext, Expense } from '@/components/ExpensesContext';
import ExpenseItem from '@/components/ExpenseItem';

type Category = {
  id: string;
  name: string;
  icon: keyof typeof FontAwesome.glyphMap;
};

// Default categories that will be used when no custom categories exist
const defaultCategories: Category[] = [
  { id: 'food', name: 'Food', icon: 'cutlery' },
  { id: 'transport', name: 'Transport', icon: 'car' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag' },
  { id: 'bills', name: 'Bills', icon: 'file-text' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film' },
  { id: 'other', name: 'Other', icon: 'ellipsis-h' },
];

// First define our interfaces and styles
interface ExpenseCardProps {
  description: string;
  amount: string;
  selectedCategory: Category;
  descriptionError: string | null;
  amountError: string | null;
  editingExpense: Expense | null;
  onDescriptionChange: (text: string) => void;
  onAmountChange: (text: string) => void;
  onSubmit: () => void;
  onSelectCategory: (category: Category) => void;
  descriptionRef: React.RefObject<TextInput | null>;
  amountRef: React.RefObject<TextInput | null>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  selectedIcon: {
    backgroundColor: '#4285F4',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#4285F4',
  },
  addCategoryText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
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
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  selectedCategory: {
    backgroundColor: '#4285F4',
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4285F4',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputHeight: {
    minHeight: 48,  // Explicit height to prevent rendering issues
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,  // Platform-specific padding
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,  // Match input height
  },
  currencySymbol: {
    fontSize: 16,
    color: '#666',
    marginRight: 4,
  },
  errorText: {
    color: '#e53935',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  editButton: {
    backgroundColor: '#34a853',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expensesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});

// Then define the memoized component
interface ExpenseCardProps {
  description: string;
  amount: string;
  selectedCategory: Category;
  descriptionError: string | null;
  amountError: string | null;
  editingExpense: Expense | null;
  categories: Category[];
  onDescriptionChange: (text: string) => void;
  onAmountChange: (text: string) => void;
  onSubmit: () => void;
  onSelectCategory: (category: Category) => void;
  onAddCategory: () => void;
  descriptionRef: React.RefObject<TextInput | null>;
  amountRef: React.RefObject<TextInput | null>;
}

const ExpenseCard = memo(function ExpenseCard(props: ExpenseCardProps) {
  const {
    description,
    amount,
    selectedCategory,
    descriptionError,
    amountError,
    editingExpense,
    categories,
    onDescriptionChange,
    onAmountChange,
    onSubmit,
    onSelectCategory,
    onAddCategory,
    descriptionRef,
    amountRef
  } = props;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {editingExpense ? 'Edit Expense' : 'Add New Expense'}
      </Text>
      
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory.id === cat.id && styles.selectedCategory,
              ]}
              onPress={() => onSelectCategory(cat)}
            >
              <FontAwesome
                name={cat.icon}
                size={20}
                color={selectedCategory.id === cat.id ? '#fff' : '#4285F4'}
              />
              <Text style={[
                styles.categoryText,
                selectedCategory.id === cat.id && styles.selectedCategoryText
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={onAddCategory}
          >
            <FontAwesome
              name="plus"
              size={20}
              color="#fff"
            />
            <Text style={styles.addCategoryText}>Add New</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          ref={descriptionRef}
          value={description}
          onChangeText={onDescriptionChange}
          style={[styles.input, styles.inputHeight]}
          placeholder="What did you spend on?"
          returnKeyType="next"
          maxLength={100}
          onSubmitEditing={() => amountRef.current?.focus()}
          textContentType="none"
          autoCorrect={false}
          autoCapitalize="sentences"
          blurOnSubmit={false}
        />
        {descriptionError ? (
          <Text style={styles.errorText}>{descriptionError}</Text>
        ) : null}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            ref={amountRef}
            value={amount}
            onChangeText={onAmountChange}
            style={[styles.input, styles.inputHeight, { flex: 1, borderWidth: 0 }]}
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            placeholder="0.00"
            returnKeyType="done"
            maxLength={10}
            onSubmitEditing={onSubmit}
            textContentType="none"
            autoCorrect={false}
            selectTextOnFocus
          />
        </View>
        {amountError ? (
          <Text style={styles.errorText}>{amountError}</Text>
        ) : null}
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, editingExpense && styles.editButton]}
        onPress={onSubmit}
      >
        <Text style={styles.buttonText}>
          {editingExpense ? 'Update Expense' : 'Add Expense'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

// Memoize the ExpensesList component
interface ExpensesListProps {
  expenses: Expense[];
  loading: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const ExpensesList = memo(function ExpensesList(props: ExpensesListProps) {
  const { expenses, loading, onEdit, onDelete } = props;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.emptyText}>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.expensesCard}>
      <Text style={styles.cardTitle}>Recent Expenses</Text>
      <FlatList
        data={expenses.slice().reverse()}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ExpenseItem
            key={item.id} // Adding explicit key
            item={item}
            onEdit={onEdit}
            onDelete={() => onDelete(item)}
          />
        )}
        extraData={expenses.length} // Add extraData to force re-render
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No expenses yet. Add your first expense!</Text>
        )}
      />
    </View>
  );
});

export default function ExpensesScreen() {
  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useContext(ExpensesContext);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [selectedCategory, setSelectedCategory] = useState<Category>(defaultCategories[0]);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof FontAwesome.glyphMap>('tag');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const descriptionRef = useRef<TextInput | null>(null);
  const amountRef = useRef<TextInput | null>(null);

  // Optimized input handlers
  function handleDescriptionChange(text: string) {
    setDescription(text);
    if (descriptionError) setDescriptionError(null);
  }

  function handleAmountChange(text: string) {
    // Only allow numbers and one decimal point
    const sanitizedText = text.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    if (sanitizedText === '' || /^\d*\.?\d*$/.test(sanitizedText)) {
      setAmount(sanitizedText);
      if (amountError) setAmountError(null);
    }
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      setDescriptionError('Description is required');
      descriptionRef.current?.focus();
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAmountError('Please enter a valid amount');
      amountRef.current?.focus();
      return;
    }

    const expenseData = {
      description: description.trim(),
      amount: Math.round(amountNum * 100) / 100,
      category: selectedCategory.id,
      date: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    };

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
      } else {
        await addExpense(expenseData);
      }
      
      setDescription('');
      setAmount('');
      setEditingExpense(null);
      setDescriptionError(null);
      setAmountError(null);
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setSelectedCategory(categories.find(cat => cat.id === expense.category) || categories[0]);
    descriptionRef.current?.focus();
  };

  const handleDelete = async (expense: Expense) => {
    try {
      await deleteExpense(expense.id);
      console.log('Expense deleted:', expense.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete expense. Please try again.');
    }
  };

  const handleAddCategory = () => {
    setShowNewCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    const newCategory: Category = {
      id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
      name: newCategoryName.trim(),
      icon: selectedIcon,
    };

    setCategories(prev => [...prev, newCategory]);
    setNewCategoryName('');
    setSelectedIcon('tag');
    setShowNewCategoryModal(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Modal
        visible={showNewCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewCategoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Category</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                style={[styles.input, styles.inputHeight]}
                placeholder="Enter category name"
                maxLength={30}
              />
            </View>
            <View>
              <Text style={styles.inputLabel}>Select Icon</Text>
              <ScrollView style={styles.iconGrid} horizontal>
                {['tag', 'home', 'car', 'plane', 'train', 'bus', 'taxi', 'bicycle', 'coffee', 'cutlery', 'shopping-cart', 'gift', 'heart', 'briefcase', 'graduation-cap', 'book', 'music', 'film', 'gamepad', 'futbol-o', 'medkit', 'stethoscope', 'hospital-o', 'ambulance', 'pills', 'dollar', 'credit-card', 'money', 'bank', 'university'].map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconButton,
                      selectedIcon === icon && styles.selectedIcon,
                    ]}
                    onPress={() => setSelectedIcon(icon as keyof typeof FontAwesome.glyphMap)}
                  >
                    <FontAwesome
                      name={icon as keyof typeof FontAwesome.glyphMap}
                      size={24}
                      color={selectedIcon === icon ? '#fff' : '#666'}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: '#666' }]}
                onPress={() => setShowNewCategoryModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSaveCategory}
              >
                <Text style={styles.buttonText}>Save Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <ExpenseCard 
          description={description}
          amount={amount}
          selectedCategory={selectedCategory}
          descriptionError={descriptionError}
          amountError={amountError}
          editingExpense={editingExpense}
          categories={categories}
          onDescriptionChange={handleDescriptionChange}
          onAmountChange={handleAmountChange}
          onSubmit={handleSubmit}
          onSelectCategory={setSelectedCategory}
          onAddCategory={handleAddCategory}
          descriptionRef={descriptionRef}
          amountRef={amountRef}
        />
        <ExpensesList 
          expenses={expenses}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

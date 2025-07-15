import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, StatusBar, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, TextInput, HelperText, Menu, Divider, ActivityIndicator, Card, useTheme, Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { api, Expense } from '@/services/api';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/ExpenseCategories';

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams();
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Error states
  const [titleError, setTitleError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const expense = await api.getExpenseById(id as string);
      
      setTitle(expense.title);
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setNotes(expense.notes || '');
      setDate(parseISO(expense.date));
    } catch (error) {
      console.error('Error fetching expense:', error);
      Alert.alert('Error', 'Failed to load expense details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateInputs = () => {
    let isValid = true;
    
    // Validate title
    if (!title.trim()) {
      setTitleError('Please enter an expense title');
      isValid = false;
    } else {
      setTitleError('');
    }
    
    // Validate amount
    if (!amount) {
      setAmountError('Please enter an amount');
      isValid = false;
    } else {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setAmountError('Please enter a valid positive amount');
        isValid = false;
      } else {
        setAmountError('');
      }
    }
    
    // Validate category
    if (!category) {
      setCategoryError('Please select a category');
      isValid = false;
    } else {
      setCategoryError('');
    }
    
    return isValid;
  };

  const handleSubmit = async () => {
    if (validateInputs()) {
      try {
        setSaving(true);
        await api.updateExpense(id as string, {
          title: title.trim(),
          amount: parseFloat(amount),
          category,
          date: format(date, 'yyyy-MM-dd'),
          notes: notes.trim()
        });
        
        router.back();
      } catch (error) {
        console.error('Error updating expense:', error);
        Alert.alert('Error', 'Failed to update expense');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await api.deleteExpense(id as string);
              router.back();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  const getCategoryIcon = (cat: string) => {
    if (!cat) return 'tag';
    return CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || 'tag';
  };
  
  const categoryColor = category && 
    Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, category) 
      ? CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] 
      : CATEGORY_COLORS.Other;
  
  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <LinearGradient
          colors={['#4568DC', '#B06AB3']}
          style={styles.loadingBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading expense details...</Text>
        </LinearGradient>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4568DC" barStyle="light-content" />
      
      {/* Header Section */}
      <LinearGradient
        colors={['#4568DC', '#B06AB3']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            iconColor="white"
            size={24}
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Text style={styles.headerTitle}>Edit Expense</Text>
          <Text style={styles.headerSubtitle}>Update your expense details</Text>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.formCard} elevation={4}>
          <Card.Content style={styles.formContent}>
            <View style={styles.formIntro}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                <MaterialCommunityIcons 
                  name={getCategoryIcon(category) as any} 
                  size={24} 
                  color="white" 
                />
                <Text style={styles.categoryBadgeText}>{category}</Text>
              </View>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.inputGroup}>
                <TextInput
                  label="Expense Title"
                  placeholder="What was this expense for?"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                  error={!!titleError}
                  mode="outlined"
                  autoCapitalize="sentences"
                  returnKeyType="next"
                  left={<TextInput.Icon icon="format-title" />}
                  outlineStyle={{ borderRadius: 12 }}
                  activeOutlineColor="#4568DC"
                />
                {!!titleError && <HelperText type="error">{titleError}</HelperText>}
              </View>
            
              <View style={styles.inputGroup}>
                <TextInput
                  label="Amount Spent"
                  placeholder="How much did you spend?"
                  value={amount}
                  onChangeText={setAmount}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  error={!!amountError}
                  mode="outlined"
                  left={<TextInput.Icon icon="currency-usd" />}
                  outlineStyle={{ borderRadius: 12 }}
                  activeOutlineColor="#4568DC"
                />
                {!!amountError && <HelperText type="error">{amountError}</HelperText>}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Category</Text>
              <Divider style={styles.divider} />
              
              {!!categoryError && <HelperText type="error">{categoryError}</HelperText>}
              
              <View style={styles.categorySelectionArea}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScrollContent}
                >
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    const catColor = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#808080';
                    const iconName = getCategoryIcon(cat);
                    
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryButton,
                          isSelected && { backgroundColor: `${catColor}20`, borderColor: catColor, shadowColor: catColor, shadowOpacity: 0.4 }
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <View style={[styles.categoryIcon, { backgroundColor: catColor }]}>
                          <MaterialCommunityIcons name={iconName as any} size={20} color="white" />
                        </View>
                        <Text 
                          style={[
                            styles.categoryText, 
                            isSelected && { color: catColor, fontWeight: 'bold' }
                          ]}
                        >
                          {cat}
                        </Text>
                        {isSelected && (
                          <View style={[styles.selectedMark, { backgroundColor: catColor }]}>
                            <MaterialCommunityIcons name="check" size={12} color="white" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Date & Notes</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.datePickerContainer}>
                <TextInput
                  label="Date of Expense"
                  value={format(date, 'MMMM dd, yyyy')}
                  style={styles.input}
                  editable={false}
                  mode="outlined"
                  left={<TextInput.Icon icon="calendar" />}
                  right={<TextInput.Icon icon="calendar-edit" onPress={() => setShowDatePicker(true)} />}
                  outlineStyle={{ borderRadius: 12 }}
                  activeOutlineColor="#4568DC"
                />
                
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>
              
              <TextInput
                label="Additional Notes"
                placeholder="Any additional details about this expense?"
                value={notes}
                onChangeText={setNotes}
                style={[styles.input, styles.multilineInput]}
                multiline
                numberOfLines={4}
                mode="outlined"
                left={<TextInput.Icon icon="text" />}
                outlineStyle={{ borderRadius: 12 }}
                activeOutlineColor="#4568DC"
              />
            </View>
            
            <View style={styles.buttonContainer}>
              <Button 
                mode="contained"
                onPress={handleSubmit}
                style={styles.submitButton}
                disabled={saving}
                loading={saving}
                icon="check"
                contentStyle={{ paddingVertical: 6 }}
                buttonColor="#4568DC"
              >
                Save Changes
              </Button>
              
              <Button 
                mode="outlined"
                onPress={() => router.back()}
                style={[styles.cancelButton, { borderColor: '#B06AB3' }]}
                disabled={saving}
                icon="close"
                contentStyle={{ paddingVertical: 6 }}
                textColor="#B06AB3"
              >
                Cancel
              </Button>
              
              <Button 
                mode="outlined"
                onPress={handleDelete}
                style={[styles.deleteButton, { borderColor: '#FF5252' }]}
                disabled={saving}
                icon="trash-can-outline"
                contentStyle={{ paddingVertical: 6 }}
                textColor="#FF5252"
              >
                Delete Expense
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
  },
  loadingBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  header: {
    height: 140,
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    flex: 1,
    paddingBottom: 15,
    paddingLeft: 16,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    borderRadius: 15,
    marginTop: -20,
    elevation: 4,
    overflow: 'hidden',
  },
  formContent: {
    padding: 0,
  },
  formIntro: {
    backgroundColor: '#F5F7FF',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: '#4568DC',
  },
  categoryBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  formSection: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4568DC',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'white',
  },
  multilineInput: {
    marginBottom: 16,
    height: 120,
    textAlignVertical: 'top',
  },
  categorySelectionArea: {
    marginBottom: 10,
  },
  categoryScrollContent: {
    paddingRight: 20,
    paddingVertical: 8,
  },
  categoryButton: {
    alignItems: 'center',
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    width: 85,
    position: 'relative',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.2,
    shadowColor: '#000',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#808080',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedMark: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#5C6BC0',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
    backgroundColor: '#F5F7FF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    borderRadius: 25,
    elevation: 2,
  },
  cancelButton: {
    borderRadius: 25,
  },
  deleteButton: {
    borderRadius: 25,
    marginTop: 8,
  },
});

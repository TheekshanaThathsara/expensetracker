import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Button, Card, Divider, HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';

import { CATEGORY_COLORS, CATEGORY_ICONS, EXPENSE_CATEGORIES } from '@/constants/ExpenseCategories';
import { api } from '@/services/api';

export default function AddExpenseScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Error states
  const [titleError, setTitleError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [categoryError, setCategoryError] = useState('');

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
        setLoading(true);
        
        console.log('Submitting expense with data:', {
          title: title.trim(),
          amount: parseFloat(amount),
          category,
          date: format(date, 'yyyy-MM-dd'),
          notes: notes.trim()
        });
        
        const result = await api.createExpense({
          title: title.trim(),
          amount: parseFloat(amount),
          category,
          date: format(date, 'yyyy-MM-dd'),
          notes: notes.trim()
        });
        
        if (result) {
          console.log('Expense created successfully:', result);
          
          // Show success feedback
          console.log('✅ Expense saved! Reports will auto-refresh.');
          
          // Reset form
          setTitle('');
          setAmount('');
          setCategory('');
          setNotes('');
          setDate(new Date());
          
          // Navigate back to expenses list - the useFocusEffect in reports will auto-refresh
          router.replace('/(tabs)/' as any);
        } else {
          console.error('Failed to create expense - no result returned');
        }
      } catch (error) {
        console.error('Error saving expense:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const confirmDate = () => {
    setShowDatePicker(false);
  };

  const cancelDate = () => {
    setShowDatePicker(false);
  };
  
  const getCategoryIcon = (cat: string) => {
    if (!cat) return 'tag';
    return CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || 'tag';
  };
  
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
          <Text style={styles.headerTitle}>New Expense</Text>
          <Text style={styles.headerSubtitle}>Please fill in the expense details</Text>
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
              <MaterialCommunityIcons name="file-document-edit-outline" size={36} color="#4568DC" />
              <Text style={styles.formIntroText}>
                Track your expenses easily and accurately
              </Text>
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
                  label="Amount Spent (LKR)"
                  placeholder="How much did you spend?"
                  value={amount}
                  onChangeText={setAmount}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  error={!!amountError}
                  mode="outlined"
                  left={<TextInput.Icon icon="cash" />}
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
                    const categoryColor = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#808080';
                    const iconName = getCategoryIcon(cat);
                    
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryButton,
                          isSelected && { backgroundColor: `${categoryColor}20`, borderColor: categoryColor, shadowColor: categoryColor, shadowOpacity: 0.4 }
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <View style={[styles.categoryIcon, { backgroundColor: categoryColor }]}>
                          <MaterialCommunityIcons name={iconName as any} size={20} color="white" />
                        </View>
                        <Text 
                          style={[
                            styles.categoryText, 
                            isSelected && { color: categoryColor, fontWeight: 'bold' }
                          ]}
                        >
                          {cat}
                        </Text>
                        {isSelected && (
                          <View style={[styles.selectedMark, { backgroundColor: categoryColor }]}>
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
                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                  <TextInput
                    label="Date of Expense"
                    value={format(date, 'EEEE, MMMM dd, yyyy')}
                    style={styles.input}
                    editable={false}
                    mode="outlined"
                    left={<TextInput.Icon icon="calendar" />}
                    right={<TextInput.Icon icon="calendar-edit" />}
                    outlineStyle={{ borderRadius: 12 }}
                    activeOutlineColor="#4568DC"
                    pointerEvents="none"
                  />
                </TouchableOpacity>
                
                {/* Enhanced Calendar Modal */}
                <Modal
                  visible={showDatePicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={cancelDate}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.calendarModalContent}>
                      <View style={styles.calendarModalHeader}>
                        <Text style={styles.calendarModalTitle}>Select Expense Date</Text>
                        <IconButton
                          icon="close"
                          size={24}
                          onPress={cancelDate}
                          iconColor="#666"
                        />
                      </View>
                      
                      <View style={styles.calendarContainer}>
                        <View style={styles.selectedDateDisplay}>
                          <MaterialCommunityIcons name="calendar-today" size={24} color="#4568DC" />
                          <Text style={styles.selectedDateText}>
                            {format(date, 'EEEE, MMMM dd, yyyy')}
                          </Text>
                        </View>
                        
                        {/* Quick Date Selection */}
                        <View style={styles.quickDateSelection}>
                          <TouchableOpacity 
                            style={[
                              styles.quickDateButton, 
                              format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && styles.quickDateButtonActive
                            ]}
                            onPress={() => setDate(new Date())}
                          >
                            <MaterialCommunityIcons name="calendar-today" size={16} color="#4568DC" />
                            <Text style={[
                              styles.quickDateText,
                              format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && styles.quickDateTextActive
                            ]}>Today</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[
                              styles.quickDateButton,
                              format(date, 'yyyy-MM-dd') === format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd') && styles.quickDateButtonActive
                            ]}
                            onPress={() => setDate(new Date(Date.now() - 24 * 60 * 60 * 1000))}
                          >
                            <MaterialCommunityIcons name="calendar-minus" size={16} color="#4568DC" />
                            <Text style={[
                              styles.quickDateText,
                              format(date, 'yyyy-MM-dd') === format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd') && styles.quickDateTextActive
                            ]}>Yesterday</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[
                              styles.quickDateButton,
                              format(date, 'yyyy-MM-dd') === format(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') && styles.quickDateButtonActive
                            ]}
                            onPress={() => setDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))}
                          >
                            <MaterialCommunityIcons name="calendar-minus" size={16} color="#4568DC" />
                            <Text style={[
                              styles.quickDateText,
                              format(date, 'yyyy-MM-dd') === format(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') && styles.quickDateTextActive
                            ]}>2 Days Ago</Text>
                          </TouchableOpacity>
                        </View>
                        
                        {/* Calendar Component */}
                        <Calendar
                          current={format(date, 'yyyy-MM-dd')}
                          onDayPress={(day) => {
                            setDate(new Date(day.dateString));
                          }}
                          maxDate={format(new Date(), 'yyyy-MM-dd')}
                          enableSwipeMonths={true}
                          theme={{
                            backgroundColor: '#ffffff',
                            calendarBackground: '#ffffff',
                            textSectionTitleColor: '#b6c1cd',
                            selectedDayBackgroundColor: '#4568DC',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#4568DC',
                            dayTextColor: '#2d4150',
                            textDisabledColor: '#d9e1e8',
                            dotColor: '#4568DC',
                            selectedDotColor: '#ffffff',
                            arrowColor: '#4568DC',
                            monthTextColor: '#4568DC',
                            indicatorColor: '#4568DC',
                            textDayFontFamily: 'System',
                            textMonthFontFamily: 'System',
                            textDayHeaderFontFamily: 'System',
                            textDayFontWeight: '400',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 16,
                            textMonthFontSize: 18,
                            textDayHeaderFontSize: 14
                          }}
                          style={styles.calendar}
                          markedDates={{
                            [format(date, 'yyyy-MM-dd')]: {
                              selected: true,
                              selectedColor: '#4568DC',
                              selectedTextColor: '#ffffff'
                            },
                            [format(new Date(), 'yyyy-MM-dd')]: {
                              marked: true,
                              dotColor: '#4568DC'
                            }
                          }}
                        />
                      </View>
                      
                      <View style={styles.calendarModalActions}>
                        <Button
                          mode="outlined"
                          onPress={cancelDate}
                          style={styles.calendarModalButton}
                          labelStyle={{ fontSize: 16 }}
                        >
                          Cancel
                        </Button>
                        <Button
                          mode="contained"
                          onPress={confirmDate}
                          style={styles.calendarModalButton}
                          buttonColor="#4568DC"
                          labelStyle={{ fontSize: 16 }}
                        >
                          Confirm Date
                        </Button>
                      </View>
                    </View>
                  </View>
                </Modal>
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
                disabled={loading}
                loading={loading}
                icon="check"
                contentStyle={{ paddingVertical: 6 }}
                buttonColor="#4568DC"
              >
                Save Expense
              </Button>
              
              <Button 
                mode="outlined"
                onPress={() => router.back()}
                style={[styles.cancelButton, { borderColor: '#B06AB3' }]}
                disabled={loading}
                icon="close"
                contentStyle={{ paddingVertical: 6 }}
                textColor="#B06AB3"
              >
                Cancel
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
  formIntroText: {
    marginTop: 8,
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  calendarModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4568DC',
  },
  calendarContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  selectedDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E3E7FF',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4568DC',
    marginLeft: 8,
  },
  quickDateSelection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  quickDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E3E7FF',
    backgroundColor: '#FFFFFF',
    gap: 4,
    minWidth: 90,
  },
  quickDateButtonActive: {
    backgroundColor: '#E3E7FF',
    borderColor: '#4568DC',
  },
  quickDateText: {
    fontSize: 12,
    color: '#4568DC',
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  quickDateTextActive: {
    color: '#4568DC',
    fontWeight: '600',
  },
  enhancedDatePicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minHeight: Platform.OS === 'android' ? 200 : 150,
  },
  calendar: {
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginVertical: 10,
    paddingBottom: 10,
  },
  calendarModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    gap: 12,
  },
  calendarModalButton: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 350,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerStyle: {
    height: 200,
    marginVertical: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
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
});

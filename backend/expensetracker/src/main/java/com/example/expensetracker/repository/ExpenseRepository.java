package com.example.expensetracker.repository;

import com.example.expensetracker.model.Expense;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends MongoRepository<Expense, String> {
    
    List<Expense> findByDateBetween(LocalDate startDate, LocalDate endDate);
    
    List<Expense> findByCategory(String category);
    
    @Query("{'date': { $gte: ?0, $lte: ?1 }, 'category': ?2}")
    List<Expense> findByDateBetweenAndCategory(LocalDate startDate, LocalDate endDate, String category);
    
    List<Expense> findByOrderByDateDesc();
}

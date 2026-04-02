package com.group5.backend.controller;

import com.group5.backend.model.entity.TradeHistory;
import com.group5.backend.repository.TradeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TradeHistoryController {

    @Autowired
    private TradeRepository tradeRepository;

    @GetMapping("/records")
    public List<TradeHistory> getAllRecords() {

        return tradeRepository.findAll();
    }
}

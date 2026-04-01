package com.group5.backend.controller;

import com.group5.backend.service.FinnhubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stocks")
@CrossOrigin
public class StockController {

    @Autowired
    private FinnhubService finnhubService;

    @GetMapping("/search")
    public List<Map<String, String>> search(@RequestParam String q) {
        return finnhubService.searchStocks(q);
    }
}
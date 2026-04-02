package com.group5.backend.controller;

import com.group5.backend.model.dto.CompanyProfileResponse;
import com.group5.backend.service.FinnhubService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stocks")
@CrossOrigin
public class StockController {

    private final FinnhubService finnhubService;

    public StockController(FinnhubService finnhubService) {
        this.finnhubService = finnhubService;
    }

    @GetMapping("/search")
    public List<Map<String, String>> search(@RequestParam String q) {
        return finnhubService.searchStocks(q);
    }

    @GetMapping("/profile2")
    public CompanyProfileResponse getCompanyProfile(
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String isin,
            @RequestParam(required = false) String cusip
    ) {
        return finnhubService.getCompanyProfile(symbol, isin, cusip);
    }
}

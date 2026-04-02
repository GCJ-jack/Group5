package com.group5.backend.controller;

import com.group5.backend.model.dto.TradeRequest;
import com.group5.backend.service.TradeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trade")
public class TradeController {

    @Autowired
    private TradeService tradeService;

    @PostMapping("/buy")
    public String buyStock(@RequestBody TradeRequest request) {
        tradeService.executeBuy(request);
        return "success";
    }
}



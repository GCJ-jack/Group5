package com.group5.backend.controller;

import com.group5.backend.model.PortfolioItem;
import com.group5.backend.model.PortfolioResponse;
import com.group5.backend.model.SellRequest;
import com.group5.backend.model.dto.PortfolioGainerResponse;
import com.group5.backend.service.PortfolioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin
public class PortfolioController {

    @Autowired
    private PortfolioService service;

    @GetMapping("/portfolio")
    public List<PortfolioResponse> getAll() {
        return service.getAll();
    }

    @PostMapping("/portfolio")
    public PortfolioItem add(@RequestBody PortfolioItem item) {
        return service.add(item);
    }

    @PostMapping("/portfolio/sell")
    public void sell(@RequestBody SellRequest req) {
        service.sell(req.id, req.quantity);
    }

    @GetMapping("/portfolio/value")
    public double totalValue() {
        return service.getTotalValue();
    }

    @GetMapping("/portfolio/top-gainers")
    public List<PortfolioGainerResponse> topGainers(@RequestParam(defaultValue = "5") int limit) {
        return service.getTopGainers(limit);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}

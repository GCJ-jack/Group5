package com.group5.backend.controller;

import com.group5.backend.model.PortfolioItem;
import com.group5.backend.service.PortfolioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin
public class PortfolioController {

    @Autowired
    private PortfolioService service;

    @GetMapping("/portfolio")
    public List<PortfolioItem> getAll() {
        return service.getAll();
    }

    @PostMapping("/portfolio")
    public PortfolioItem add(@RequestBody PortfolioItem item) {
        return service.add(item);
    }

    @DeleteMapping("/portfolio/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/portfolio/value")
    public double totalValue() {
        return service.getTotalValue();
    }
}

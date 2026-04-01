package com.group5.backend.service;

import com.group5.backend.model.PortfolioItem;
import com.group5.backend.model.PortfolioResponse;
import com.group5.backend.repository.PortfolioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
public class PortfolioService {

    private static final Set<String> ALLOWED_TYPES = Set.of("Equity", "Crypto", "ETF", "Bond", "Cash");

    @Autowired
    private PortfolioRepository repository;

    @Autowired
    private FinnhubService finnhubService; // ✅ 改这里

    public List<PortfolioResponse> getAll() {
        return repository.findAll().stream()
                .map(item -> {
                    double price = finnhubService.getPrice(item.getTicker());
                    String type = item.getType();

                    if (type == null || type.isBlank()) {
                        type = finnhubService.getType(item.getTicker());
                    }

                    return new PortfolioResponse(
                            item.getId(),
                            finnhubService.getName(item.getTicker()),
                            item.getTicker(),
                            type,
                            item.getQuantity(),
                            price,
                            item.getTime()
                    );
                })
                .toList();
    }

    public PortfolioItem add(PortfolioItem item) {
        if (item.getTicker() == null || item.getTicker().trim().isEmpty()) {
            throw new IllegalArgumentException("Ticker cannot be empty.");
        }

        if (item.getType() == null || item.getType().trim().isEmpty()) {
            throw new IllegalArgumentException("Type cannot be empty.");
        }

        if (item.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be a positive integer.");
        }

        item.setTicker(item.getTicker().trim().toUpperCase());
        item.setType(normalizeType(item.getType()));
        item.setTime(LocalDateTime.now());

        return repository.save(item);
    }

    public void sell(Long id, int sellQty) {
        PortfolioItem item = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found."));

        if (sellQty <= 0) {
            throw new IllegalArgumentException("Sell quantity must be a positive integer.");
        }

        if (sellQty > item.getQuantity()) {
            throw new IllegalArgumentException("Sell quantity cannot be greater than current holdings.");
        }

        int newQty = item.getQuantity() - sellQty;

        if (newQty == 0) {
            repository.deleteById(id);
        } else {
            item.setQuantity(newQty);
            item.setTime(LocalDateTime.now());
            repository.save(item);
        }
    }

    public double getTotalValue() {
        return repository.findAll().stream()
                .mapToDouble(item -> item.getQuantity() * finnhubService.getPrice(item.getTicker())) // ✅
                .sum();
    }
    private String normalizeType(String type) {
        String normalized = type.trim();

        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Type cannot be empty.");
        }

        String canonical = switch (normalized.toLowerCase()) {
            case "equity" -> "Equity";
            case "crypto" -> "Crypto";
            case "etf" -> "ETF";
            case "bond" -> "Bond";
            case "cash" -> "Cash";
            default -> throw new IllegalArgumentException("Type must be one of: Equity, Crypto, ETF, Bond, Cash.");
        };

        if (!ALLOWED_TYPES.contains(canonical)) {
            throw new IllegalArgumentException("Type must be one of: Equity, Crypto, ETF, Bond, Cash.");
        }

        return canonical;
    }
}

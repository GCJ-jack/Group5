package com.group5.backend.service;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.group5.backend.model.entity.StockAll;
import com.group5.backend.repository.StockRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.client.RestTemplate;
import com.group5.backend.service.FinnhubService;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class StockService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final StockRepository stockRepository;

    @Value("${finnhub.api.token}")
    private String apiKey;

    // 通过构造函数注入 Repository
    public StockService(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    /**
     * 从 Finnhub 获取数据 (以 ETF 为例)
     */
    public List<StockAll> fetchFinnhubData() {
        String url = "https://finnhub.io/api/v1/stock/symbol?exchange=US&type=etf&token=" + apiKey;
        try {
            // 直接映射到实体类数组
            StockAll[] response = restTemplate.getForObject(url, StockAll[].class);
            return response != null ? Arrays.asList(response) : List.of();
        } catch (Exception e) {
            e.printStackTrace();
            return List.of();
        }
    }

    /**
     * 保存股票到数据库
     */
    public boolean saveStock(StockAll stock) {
        // 先检查是否存在
        Optional<StockAll> existingStock = stockRepository.findBySymbol(stock.getSymbol());
        if (existingStock.isPresent()) {
            return false; // 已存在，不重复添加
        }

        // JPA 保存操作，无需 SQL
        stockRepository.save(stock);
        return true;
    }

    /**
     * 获取所有已保存的股票
     */
    public List<StockAll> getAllSavedStocks() {
        return stockRepository.findAll();
    }

    // 统一接口：返回带价格的列表
    @GetMapping("/symbols/all")
    public List<ObjectNode> getAllSymbols() {
        return FinnhubService.getStockListWithPrices();
    }
}

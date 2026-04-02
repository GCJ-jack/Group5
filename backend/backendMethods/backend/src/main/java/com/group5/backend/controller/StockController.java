package com.group5.backend.controller;

import com.group5.backend.model.entity.StockAll;
import com.group5.backend.service.StockService;
import org.springframework.web.bind.annotation.*;
import com.group5.backend.service.FinnhubService;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class StockController {

    private final StockService stockService;
    private final FinnhubService finnhubService;

    public StockController(StockService stockService, FinnhubService finnhubService) {
        this.stockService = stockService;
        this.finnhubService = finnhubService;
    }

    // 1. 获取 Finnhub 实时数据
    @GetMapping("/symbols")
    public List<StockAll> getSymbols() {
        return stockService.fetchFinnhubData();
    }

    // 2. 添加单个股票到数据库
    @PostMapping("/add")
    public Map<String, Object> addStock(@RequestBody StockAll stock) {
        boolean success = stockService.saveStock(stock);
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success ? "添加成功" : "添加失败（可能已存在）");
        return response;
    }

    // 3. 查看已保存列表
    @GetMapping("/saved")
    public List<StockAll> getSaved() {
        return stockService.getAllSavedStocks();
    }

    @GetMapping("/symbols/all")
    public List<Map<String, String>> getAllEtfSymbols() {
        return finnhubService.getAllEtfSymbols();
    }

    /**
     * 获取单支股票实时报价
     * 接口地址: GET /api/quote?symbol=AAPL
     */
    @GetMapping("/quote")
    public Map<String, Object> getQuote(@RequestParam String symbol) {
        return finnhubService.getRealTimePrice(symbol);
    }

    // 批量获取价格
//    @PostMapping("/batch")
//    public Map<String, BigDecimal> getBatchPrices(@RequestBody List<String> symbols) {
//        return finnhubService.getBatchPrices(symbols);
//    }

//    @Autowired
//    private FinnhubService finnhubService;

    // 统一接口：返回带价格的列表
//    @GetMapping("/symbols/all")
//    public List<ObjectNode> getAllSymbols() {
//        return finnhubService.getStockListWithPrices();
//    }
//}


}

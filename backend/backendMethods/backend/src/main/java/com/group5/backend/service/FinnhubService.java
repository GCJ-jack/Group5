package com.group5.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.group5.backend.model.dto.FinnhubNewsItem;
import com.group5.backend.model.dto.QuoteResponse;
import com.group5.backend.model.dto.SearchResultDto;
import com.group5.backend.model.dto.StockSymbolDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
@Service
public class FinnhubService {

    private final RestClient finnhubRestClient;
    private final String apiToken;


    public FinnhubService(RestClient finnhubRestClient, @Value("${finnhub.api.token}") String apiToken) {
        this.finnhubRestClient = finnhubRestClient;
        this.apiToken = apiToken;
    }

    /**
     * 获取指定交易所和类型的证券列表
     * @param exchange 交易所代码，例如 "US", "HK"
     * @param type 类型，例如 "stock", "etf", "fund"
     * @return 证券列表
     */
    public List<StockSymbolDto> getAllSymbols(String exchange, String type) {
        validateToken();

        try {
            // 在 .get() 之前打印
//            System.out.println("正在请求 Finnhub API: " + "https://finnhub.io/stock/symbol?exchange=" + exchange + "&token=" + apiToken);

            String htmlresponse = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/stock/symbol")
                            .queryParam("exchange", exchange)
//                            .queryParam("type", type) // 关键参数：区分 stock, etf, fund
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            System.out.println("=== 服务器返回的原始内容 ===");
            System.out.println(htmlresponse);
            System.out.println("==========================");
//            if (htmlresponse == null) {
//                return List.of();
//            }
//            return List.of();
            Pattern pattern = Pattern.compile("href=\"([^\"]+)\"");
            Matcher matcher = pattern.matcher(htmlresponse);

            if (matcher.find()) {
                String redirectUrl = matcher.group(1);
                System.out.println("提取到的 URL: " + redirectUrl);

                // 请求实际的 JSON 数据
                StockSymbolDto[] response = finnhubRestClient.get()
                        .uri(redirectUrl)
                        .retrieve()
                        .body(StockSymbolDto[].class);

                if (response == null) {
                    return List.of();
                }
                return Arrays.asList(response);
            } else {
                System.err.println("未找到重定向 URL");
                return List.of();
            }

        } catch (Exception e) {
            System.err.println("Error fetching symbols: " + e.getMessage());
            e.printStackTrace();
            return List.of();
        }
    }

    /**
     * 获取所有美股 ETF 并转换为 Map 列表（方便前端直接展示）
     */
    public List<Map<String, String>> getAllEtfSymbols() {
        List<StockSymbolDto> symbols = getAllSymbols("US", "etf");

        // 将对象转换为 Map，避免前端出现 null 字段问题
        return symbols.stream()
                .limit(100)
                .map(symbol -> {
                    Map<String, String> map = new HashMap<>();
                    map.put("symbol", symbol.symbol);
                    map.put("description", symbol.description != null ? symbol.description : "");
                    map.put("displaySymbol", symbol.displaySymbol != null ? symbol.displaySymbol : symbol.symbol);
//                    map.put("type", symbol.type != null ? symbol.type : "ETF");
                    map.put("currency", symbol.currency != null ? symbol.currency : "USD");
                    return map;
                })
                .collect(Collectors.toList());
    }

    /**
     * 获取实时报价 (使用 RestClient)
     */
    public Map<String, Object> getRealTimePrice(String symbol) {
        Map<String, Object> result = new HashMap<>();

        try {
            // 1. 使用 RestClient 发送 GET 请求
            // 我们直接请求 Finnhub 的 /quote 接口
            JsonNode responseBody = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/quote")
                            .queryParam("symbol", symbol)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);

            // 2. 解析数据
            if (responseBody != null && responseBody.has("c")) {
                double currentPrice = responseBody.get("c").asDouble();

                // ⭐ 获取时间戳 (t) - Finnhub 返回的是 Unix 时间戳 (秒)
                long timestampSeconds = responseBody.has("t") ? responseBody.get("t").asLong() : System.currentTimeMillis() / 1000;

                // 转换为 Java Date (需要乘以 1000 转为毫秒)
                java.util.Date updateTime = new java.util.Date(timestampSeconds * 1000);

                result.put("symbol", symbol);
                result.put("currentPrice", currentPrice);
                result.put("updateTime", updateTime); // 传递 Date 对象，Spring 会自动序列化
                result.put("success", true);
            } else {
                result.put("success", false);
                result.put("message", "Invalid response from Finnhub");
            }

        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", false);
            result.put("message", e.getMessage());
        }

        return result;
    }



    public List<FinnhubNewsItem> getMarketNews(String category, Long minId) {
        validateToken();

        FinnhubNewsItem[] response = finnhubRestClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/news")
                        .queryParam("category", category)
                        .queryParam("minId", minId)
                        .queryParam("token", apiToken)
                        .build())
                .retrieve()
                .body(FinnhubNewsItem[].class);

        if (response == null) {
            return List.of();
        }

        return Arrays.stream(response)
                .sorted(Comparator.comparingLong(FinnhubNewsItem::id).reversed())
                .toList();
    }

    public double getPrice(String ticker) {
        validateToken();

        try {

            ticker = ticker.toUpperCase();

            String finalTicker = ticker;
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/quote")
                            .queryParam("symbol", finalTicker)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);

            double current = json.optDouble("c", 0.0);
            double prevClose = json.optDouble("pc", 0.0);

            // ⭐ 关键逻辑：如果 current=0，用昨收价
            if (current == 0.0) {
                if (prevClose > 0) {
                    return prevClose;
                } else {
                    System.out.println("Invalid ticker or no price: " + ticker);
                    return 0.0;
                }
            }

            return current;

        } catch (Exception e) {
            System.out.println("Finnhub price error: " + ticker);
            e.printStackTrace();
            return 0.0;
        }
    }

    public String getName(String ticker) {
        validateToken();

        try {
            ticker = ticker.toUpperCase();

            String finalTicker = ticker;
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/stock/profile2")
                            .queryParam("symbol", finalTicker)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);

            String name = json.optString("name", "");

            if (name == null || name.isEmpty()) {
                return ticker;
            }

            return name;

        } catch (Exception e) {
            return ticker;
        }
    }

    public String getType(String ticker) {
        if (ticker.endsWith("-USD")) return "Crypto";
        return "Equity";
    }
    public List<Map<String, String>> searchStocks(String query) {
        validateToken();

        List<Map<String, String>> list = new ArrayList<>();

        try {
            String response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", query)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);
            org.json.JSONArray resultArray = json.optJSONArray("result");

            if (resultArray == null) {
                return list;
            }

            for (int i = 0; i < resultArray.length(); i++) {
                org.json.JSONObject item = resultArray.getJSONObject(i);

                Map<String, String> stock = new HashMap<>();
                stock.put("symbol", item.optString("symbol", ""));
                stock.put("description", item.optString("description", ""));

                list.add(stock);
            }
        } catch (Exception e) {
            System.out.println("Search API error: " + query);
            e.printStackTrace();
        }

        return list;
    }

    private void validateToken() {
        if (!StringUtils.hasText(apiToken)) {
            throw new ResponseStatusException(
                    INTERNAL_SERVER_ERROR,
                    "FINNHUB_API_TOKEN is not configured"
            );
        }
    }

    public QuoteResponse getQuote(String symbol) {
        try {
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/quote")
                            .queryParam("symbol", symbol)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);

            return new QuoteResponse(
                    symbol, // 先用 symbol 当 name
                    json.getDouble("c"),
                    json.getDouble("d"),
                    json.getDouble("dp"),
                    json.getDouble("h"),
                    json.getDouble("l"),
                    json.getDouble("o"),
                    json.getDouble("pc")
            );

        } catch (Exception e) {
            e.printStackTrace();
            return new QuoteResponse(symbol, 0,0,0,0,0,0,0);
        }
    }

    private String getCompanyName(String symbol) {
        return switch (symbol) {
            case "AAPL" -> "Apple Inc.";
            case "TSLA" -> "Tesla, Inc.";
            case "NVDA" -> "NVIDIA Corp.";
            default -> symbol;
        };
    }

    public List<SearchResultDto> search(String symbol) {

        validateToken();

        try {
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", symbol)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);
            org.json.JSONArray result = json.getJSONArray("result");

            return result.toList().stream()
                    .map(obj -> (java.util.Map<?, ?>) obj)
                    .map(map -> new SearchResultDto(
                            map.get("symbol").toString(),
                            map.get("description").toString()
                    ))
                    .limit(5) // 只返回前5个（很关键）
                    .toList();
        } catch (Exception e) {
            e.printStackTrace();
            return List.of();
        }
    }


}

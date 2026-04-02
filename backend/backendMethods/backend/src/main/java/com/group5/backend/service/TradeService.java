package com.group5.backend.service;

import com.group5.backend.model.dto.TradeRequest;
import com.group5.backend.model.entity.TradeHistory;
import com.group5.backend.model.entity.UserHolding;
import com.group5.backend.repository.TradeRepository;
import com.group5.backend.repository.UserHoldingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class TradeService {

    @Autowired
    private TradeRepository tradeHistoryRepository;

    @Autowired
    private UserHoldingRepository userHoldingRepository;

    /**
     * 执行买入操作
     */
    @Transactional
    public void executeBuy(TradeRequest request) {
        String symbol = request.getSymbol();
        Integer buyQuantity = request.getQuantity();
        BigDecimal buyPrice = request.getPrice();

        // 1. 计算总价
        BigDecimal totalAmount = buyPrice.multiply(new BigDecimal(buyQuantity));

        // 2. 写入交易流水 (trade_history)
        TradeHistory history = new TradeHistory();
        history.setStockName(request.getStockName());
        history.setSymbol(symbol);
        history.setType("BUY");
        history.setPrice(buyPrice);
        history.setQuantity(buyQuantity);
        history.setTotalAmount(totalAmount);
        history.setOrderTime(LocalDateTime.now());
        history.setAssetType(request.getAssetType());
        tradeHistoryRepository.save(history);

        // 3. 更新用户资产 (user_holdings)
        UserHolding holding = userHoldingRepository.findBySymbol(symbol)
                .orElseGet(UserHolding::new); // 如果不存在则新建

        // 如果是新股票，初始化数据
        if (holding.getId() == null) {
            holding.setSymbol(symbol);
            holding.setStockName(request.getStockName());
            holding.setAssetType(request.getAssetType());
            holding.setQuantity(0);
            holding.setAvgCost(BigDecimal.ZERO);
        }

        // 计算新的平均成本 (专业金融算法)
        // (旧总市值 + 新买入金额) / (旧数量 + 新数量)
        BigDecimal oldTotalValue = holding.getAvgCost().multiply(new BigDecimal(holding.getQuantity()));
        BigDecimal newTotalValue = oldTotalValue.add(totalAmount);
        int newTotalQuantity = holding.getQuantity() + buyQuantity;

        BigDecimal newAvgCost = newTotalValue.divide(new BigDecimal(newTotalQuantity), 4, BigDecimal.ROUND_HALF_UP);

        // 更新持仓数据
        holding.setQuantity(newTotalQuantity);
        holding.setAvgCost(newAvgCost);
        holding.setCurrentPrice(buyPrice); // 当前市价设为买入价
        holding.setTotalValue(newTotalValue);

        userHoldingRepository.save(holding);
    }
}


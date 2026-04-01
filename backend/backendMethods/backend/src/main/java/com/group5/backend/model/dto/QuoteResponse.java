package com.group5.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record QuoteResponse(

        String name,
        double currentPrice,
        double change,
        double percentChange,
        double high,
        double low,
        double open,
        double previousClose

) {}
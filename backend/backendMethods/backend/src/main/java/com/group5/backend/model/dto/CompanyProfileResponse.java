package com.group5.backend.model.dto;

public record CompanyProfileResponse(
        String country,
        String currency,
        String exchange,
        String finnhubIndustry,
        String ipo,
        String logo,
        Double marketCapitalization,
        String name,
        String phone,
        Double shareOutstanding,
        String ticker,
        String weburl
) {
}

export const enum months {
    JANUARY = 0,
    FEBRUARY = 1,
    MARCH = 2,
    APRIL = 3,
    MAY = 4,
    JUNE = 5,
    JULY = 6,
    AUGUST = 7,
    SEPTEMBER = 8,
    OCTOBER = 9,
    NOVEMBER = 10,
    DECEMBER = 11,
}

export const enum monthString {
    JANUARY = "January",
    FEBRUARY = "February",
    MARCH = "March",
    APRIL = "April",
    MAY = "May",
    JUNE = "June",
    JULY = "July",
    AUGUST = "August",
    SEPTEMBER = "September",
    OCTOBER = "October",
    NOVEMBER = "November",
    DECEMBER = "December",
}

export function getMonthAsNum(month: string) {
    switch (month) {
        case monthString.JANUARY: {
            return months.JANUARY;
        }
        case monthString.FEBRUARY: {
            return months.FEBRUARY;
        }
        case monthString.MARCH: {
            return months.MARCH;
        }
        case monthString.APRIL: {
            return months.APRIL;
        }
        case monthString.MAY: {
            return months.MAY;
        }
        case monthString.JUNE: {
            return months.JUNE;
        }
        case monthString.JULY: {
            return months.JULY;
        }
        case monthString.AUGUST: {
            return months.AUGUST;
        }
        case monthString.SEPTEMBER: {
            return months.SEPTEMBER;
        }
        case monthString.OCTOBER: {
            return months.OCTOBER;
        }
        case monthString.NOVEMBER: {
            return months.NOVEMBER;
        }
        case monthString.DECEMBER: {
            return months.DECEMBER;
        }

    }
}
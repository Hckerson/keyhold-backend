import { Month, Day } from 'generated/prisma/enums';

export const metricBuilder = <
    T = Record<string, string | number | boolean | null>,
>(
    data: T,
): T & { year: number; month: Month; day: Day } => {
    const today = new Date();
    return {
        ...data,
        year: today.getFullYear(),
        day: dayConverter(today.getDay()),
        month: monthConverter(today.getMonth()),
    } as T & { year: number; month: Month; day: Day };
};

const monthConverter = (number: number): Month => {
    const actualMonth = number + 1;
    switch (actualMonth) {
        case 1:
            return Month.JAN;
        case 2:
            return Month.FEB;
        case 3:
            return Month.MAR;
        case 4:
            return Month.APR;
        case 5:
            return Month.MAY;
        case 6:
            return Month.JUN;
        case 7:
            return Month.JUL;
        case 8:
            return Month.AUG;
        case 9:
            return Month.SEP;
        case 10:
            return Month.OCT;
        case 11:
            return Month.NOV;
        case 12:
            return Month.DEC;
        default:
            return Month.JAN;
    }
};

const dayConverter = (number: number): Day => {
    switch (number) {
        case 1:
            return Day.MON;
        case 2:
            return Day.TUE;
        case 3:
            return Day.WED;
        case 4:
            return Day.THU;
        case 5:
            return Day.FRI;
        case 6:
            return Day.SAT;
        case 0:
            return Day.SUN;
        default:
            return Day.MON;
    }
};

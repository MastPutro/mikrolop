import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


const MonthDayPicker: React.FC<{ initialMonth: number; initialYear: number }> = ({ initialMonth, initialYear }) => {

    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(initialYear, initialMonth - 1, 15));

    return (
        <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => setSelectedDate(date)}
            dateFormat="dd"
            dropdownMode="select"
        />
    );
}
export default MonthDayPicker;
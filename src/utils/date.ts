import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(relativeTime);
dayjs.extend(isBetween);

export const formatDate = (date: string | Date, format: string = 'MMM D, YYYY'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('MMMM D, YYYY h:mm A');
};

export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

export const isDatePast = (date: string | Date): boolean => {
  return dayjs(date).isBefore(dayjs());
};

export const getDaysUntil = (date: string | Date): number => {
  return dayjs(date).diff(dayjs(), 'days');
};

export const getDaysOverdue = (date: string | Date): number => {
  const diff = dayjs().diff(dayjs(date), 'days');
  return diff > 0 ? diff : 0;
};

export const getAcademicPeriod = (admissionDate?: string): { session: string; term: string } => {
  const date = dayjs(admissionDate);
  const year = date.year();
  const month = date.month();
  
  let sessionYear = year;
  if (month >= 9) {
    sessionYear = year;
  } else {
    sessionYear = year - 1;
  }
  
  let term = 'First Term';
  if (month >= 9 && month <= 11) {
    term = 'First Term';
  } else if (month >= 1 && month <= 3) {
    term = 'Second Term';
  } else if (month >= 4 && month <= 7) {
    term = 'Third Term';
  }
  
  return {
    session: `${sessionYear}/${sessionYear + 1}`,
    term: term
  };
};

import { Redirect } from 'expo-router';

/** Köhnə "Host ol" axını — indi tapşırıqlar + agentlik müraciəti ilə əvəz olunub */
export default function HostApply() {
  return <Redirect href="/host-tasks" />;
}

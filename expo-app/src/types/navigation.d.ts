import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  ClientsTab: NavigatorScreenParams<ClientsStackParamList>;
  OSTab: NavigatorScreenParams<OSStackParamList>;
  FinanceTab: NavigatorScreenParams<FinanceStackParamList>;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
};

export type ClientsStackParamList = {
  ClientsList: undefined;
  ClientDetail: { clientId: string };
};

export type OSStackParamList = {
  OSList: undefined;
  OSDetail: { osId: string };
};

export type FinanceStackParamList = {
  BillingList: { preselectedOsId?: string } | undefined;
  BillingDetail: { billingId: string };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Catalog: undefined;
  Settings: undefined;
  CashFlow: undefined;
};

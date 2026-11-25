//+------------------------------------------------------------------+
//| OneTradeGuard.mq5                                                |
//| Evita la sobreoperativa: limita cuantas operaciones puedes abrir |
//| por dia y cuantas a la vez. Si abres una de mas, la cierra al    |
//| instante (MT5 no permite bloquear la orden antes de enviarla).   |
//| Solo CIERRA posiciones de mas y borra ordenes pendientes; nunca  |
//| abre operaciones.                                                |
//+------------------------------------------------------------------+
#property copyright "WilTrader"
#property version   "1.00"
#property description "Limita operaciones por dia y simultaneas. Cierra las de mas."

#include <Trade\Trade.mqh>

input int  MaxTradesPerDay    = 1;     // Maximo de operaciones nuevas por dia (0 = sin limite)
input int  MaxOpenPositions   = 1;     // Maximo de posiciones abiertas a la vez (0 = sin limite)
input int  DayResetHourServer = 0;     // Hora del SERVIDOR en que empieza el dia (0-23)
input bool BlockMode          = true;  // true = cierra la operacion de mas; false = solo avisa
input bool DeletePending      = true;  // Borra ordenes pendientes al alcanzar el limite (solo con BlockMode)
input bool SendPush           = false; // Envia notificacion al celular (requiere configurar MetaQuotes ID)

CTrade trade;
bool   busy = false;
ulong  alerted[];   // tickets ya avisados (modo solo aviso)

//--- utilidades ------------------------------------------------------
int IndexOfULong(const ulong &arr[], const ulong value)
{
   for(int i = 0; i < ArraySize(arr); i++)
      if(arr[i] == value) return i;
   return -1;
}

void Notify(const string text)
{
   Print("OneTradeGuard: ", text);
   Alert("OneTradeGuard: ", text);
   if(SendPush) SendNotification("OneTradeGuard: " + text);
}

datetime DayStart()
{
   MqlDateTime dt;
   datetime now = TimeCurrent();
   TimeToStruct(now, dt);
   dt.hour = DayResetHourServer;
   dt.min  = 0;
   dt.sec  = 0;
   datetime start = StructToTime(dt);
   if(start > now) start -= 86400;
   return start;
}

//--- logica principal ------------------------------------------------
void Enforce()
{
   if(busy) return;
   busy = true;

   datetime now   = TimeCurrent();
   datetime start = DayStart();

   if(!HistorySelect(start, now + 60))
   {
      busy = false;
      return;
   }

   // Posiciones abiertas hoy (una por identificador, en orden de apertura)
   ulong ids[];
   ArrayResize(ids, 0);
   int deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
   {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      if(HistoryDealGetInteger(d, DEAL_ENTRY) != DEAL_ENTRY_IN) continue;
      long type = HistoryDealGetInteger(d, DEAL_TYPE);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;
      ulong pid = (ulong)HistoryDealGetInteger(d, DEAL_POSITION_ID);
      if(IndexOfULong(ids, pid) < 0)
      {
         int n = ArraySize(ids);
         ArrayResize(ids, n + 1);
         ids[n] = pid;
      }
   }
   int tradesToday = ArraySize(ids);

   // Posiciones abiertas ahora
   int total = PositionsTotal();
   ulong    tk[];
   datetime tm[];
   ulong    pidOf[];
   ArrayResize(tk, 0);
   ArrayResize(tm, 0);
   ArrayResize(pidOf, 0);
   for(int i = 0; i < total; i++)
   {
      ulong t = PositionGetTicket(i);
      if(t == 0) continue;
      int n = ArraySize(tk);
      ArrayResize(tk, n + 1);
      ArrayResize(tm, n + 1);
      ArrayResize(pidOf, n + 1);
      tk[n]    = t;
      tm[n]    = (datetime)PositionGetInteger(POSITION_TIME);
      pidOf[n] = (ulong)PositionGetInteger(POSITION_IDENTIFIER);
   }
   int open = ArraySize(tk);

   // Ordenar de la mas antigua a la mas nueva
   for(int i = 1; i < open; i++)
   {
      ulong    kt = tk[i];
      datetime km = tm[i];
      ulong    kp = pidOf[i];
      int j = i - 1;
      while(j >= 0 && tm[j] > km)
      {
         tk[j + 1] = tk[j];
         tm[j + 1] = tm[j];
         pidOf[j + 1] = pidOf[j];
         j--;
      }
      tk[j + 1] = kt;
      tm[j + 1] = km;
      pidOf[j + 1] = kp;
   }

   // Marcar las que sobran
   bool violator[];
   ArrayResize(violator, open);
   ArrayInitialize(violator, false);
   int kept = 0;
   for(int i = 0; i < open; i++)
   {
      int idx = IndexOfULong(ids, pidOf[i]);
      bool overDay = (MaxTradesPerDay > 0 && idx >= MaxTradesPerDay);
      if(overDay) { violator[i] = true; continue; }
      kept++;
      if(MaxOpenPositions > 0 && kept > MaxOpenPositions)
      {
         violator[i] = true;
         kept--;
      }
   }

   // Actuar sobre las que sobran
   int closedNow = 0;
   for(int i = 0; i < open; i++)
   {
      if(!violator[i]) continue;
      if(BlockMode)
      {
         if(trade.PositionClose(tk[i]))
         {
            closedNow++;
            Notify(StringFormat("operacion #%I64u cerrada: superaba tu limite (%d por dia / %d a la vez).", tk[i], MaxTradesPerDay, MaxOpenPositions));
         }
         else
            Print("OneTradeGuard: no se pudo cerrar #", tk[i], " error ", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
      }
      else if(IndexOfULong(alerted, tk[i]) < 0)
      {
         int n = ArraySize(alerted);
         ArrayResize(alerted, n + 1);
         alerted[n] = tk[i];
         Notify(StringFormat("la operacion #%I64u supera tu limite. Cierrala tu.", tk[i]));
      }
   }

   // Ordenes pendientes: si ya no puedes abrir mas, se borran
   int openAfter = open - closedNow;
   bool noMoreAllowed = (MaxTradesPerDay > 0 && tradesToday >= MaxTradesPerDay) ||
                        (MaxOpenPositions > 0 && openAfter >= MaxOpenPositions);
   if(BlockMode && DeletePending && noMoreAllowed)
   {
      for(int i = OrdersTotal() - 1; i >= 0; i--)
      {
         ulong ot = OrderGetTicket(i);
         if(ot == 0) continue;
         if(trade.OrderDelete(ot))
            Notify(StringFormat("orden pendiente #%I64u eliminada: ya alcanzaste tu limite.", ot));
      }
   }

   Comment(StringFormat("OneTradeGuard\nOperaciones hoy: %d / %s\nPosiciones abiertas: %d / %s\nModo: %s",
           tradesToday, MaxTradesPerDay > 0 ? IntegerToString(MaxTradesPerDay) : "sin limite",
           openAfter,   MaxOpenPositions > 0 ? IntegerToString(MaxOpenPositions) : "sin limite",
           BlockMode ? "cierra las de mas" : "solo avisa"));

   busy = false;
}

//--- eventos ----------------------------------------------------------
int OnInit()
{
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
      Print("OneTradeGuard: activa el boton 'Algo Trading' de MT5 para que pueda cerrar operaciones.");
   if(AccountInfoInteger(ACCOUNT_MARGIN_MODE) != ACCOUNT_MARGIN_MODE_RETAIL_HEDGING)
      Print("OneTradeGuard: tu cuenta no es Hedging. Solo cuenta posiciones distintas; sumar lotes a una existente no se detecta.");
   EventSetTimer(1);
   Enforce();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
}

void OnTimer()
{
   Enforce();
}

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD || trans.type == TRADE_TRANSACTION_ORDER_ADD)
      Enforce();
}

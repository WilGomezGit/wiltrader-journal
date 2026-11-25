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

input string MyMessage        = "Ya cumpliste tu plan de hoy. Cada operacion extra te ha costado plata y paz. Acuerdate de las embarradas de otros dias. DISCIPLINA."; // Tu mensaje (se muestra grande)
input int    PanelSeconds     = 45;    // Segundos que el panel rojo tapa el grafico
input bool   ShowHistoryStats = true;  // Muestra lo que te costaron tus operaciones de mas (de tu historial de MT5)
input int    HistoryDays      = 90;    // Dias de historial a revisar
input bool   PlayAlarm        = true;  // Suena una alarma cuando aparece el panel

CTrade trade;
bool   busy = false;
ulong  alerted[];   // tickets ya avisados (modo solo aviso)
datetime panelUntil = 0;  // hasta cuando se muestra el panel (hora local)

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

//--- mensaje fuerte ---------------------------------------------------
long DayKey(const datetime t)
{
   return (long)((t - (datetime)(DayResetHourServer * 3600)) / 86400);
}

// Cuanto te costaron, en tu historial de MT5, las operaciones que pasaron tu limite diario.
bool OvertradingCost(const int days, int &extraCount, double &extraNet)
{
   extraCount = 0;
   extraNet   = 0.0;
   int limit = (MaxTradesPerDay > 0 ? MaxTradesPerDay : 1);
   datetime now = TimeCurrent();
   if(!HistorySelect(now - (datetime)(days * 86400), now + 60)) return false;

   ulong  pids[];
   double nets[];
   int    ords[];
   bool   done[];
   int    deals = HistoryDealsTotal();
   long   lastKey = -1;
   int    counter = 0;

   for(int i = 0; i < deals; i++)
   {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      long type = HistoryDealGetInteger(d, DEAL_TYPE);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;   // ignora depositos y retiros
      ulong  pid   = (ulong)HistoryDealGetInteger(d, DEAL_POSITION_ID);
      long   entry = HistoryDealGetInteger(d, DEAL_ENTRY);
      double value = HistoryDealGetDouble(d, DEAL_PROFIT) + HistoryDealGetDouble(d, DEAL_COMMISSION)
                   + HistoryDealGetDouble(d, DEAL_SWAP)   + HistoryDealGetDouble(d, DEAL_FEE);
      int idx = IndexOfULong(pids, pid);
      if(idx < 0)
      {
         if(entry != DEAL_ENTRY_IN) continue;      // posicion que se abrio antes del periodo revisado
         long key = DayKey((datetime)HistoryDealGetInteger(d, DEAL_TIME));
         if(key != lastKey) { lastKey = key; counter = 0; }
         counter++;
         int n = ArraySize(pids);
         ArrayResize(pids, n + 1);
         ArrayResize(nets, n + 1);
         ArrayResize(ords, n + 1);
         ArrayResize(done, n + 1);
         pids[n] = pid;
         nets[n] = value;
         ords[n] = counter;
         done[n] = false;
      }
      else
      {
         nets[idx] += value;
         if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT || entry == DEAL_ENTRY_OUT_BY) done[idx] = true;
      }
   }
   for(int i = 0; i < ArraySize(pids); i++)
      if(done[i] && ords[i] > limit)
      {
         extraCount++;
         extraNet += nets[i];
      }
   return true;
}

void Label(const string name, const string text, const int x, const int y, const int size, const color clr)
{
   if(ObjectFind(0, name) < 0) ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, name, OBJPROP_ZORDER, 10);
   ObjectSetString(0, name, OBJPROP_FONT, "Arial Black");
   ObjectSetString(0, name, OBJPROP_TEXT, text);
}

// Parte un texto largo en lineas de ~58 caracteres.
int Wrap(const string text, string &lines[])
{
   ArrayResize(lines, 0);
   string current = "";
   string words[];
   int n = StringSplit(text, ' ', words);
   for(int i = 0; i < n; i++)
   {
      if(StringLen(current) + StringLen(words[i]) + 1 > 58 && StringLen(current) > 0)
      {
         int k = ArraySize(lines);
         ArrayResize(lines, k + 1);
         lines[k] = current;
         current = "";
      }
      current += (StringLen(current) > 0 ? " " : "") + words[i];
   }
   if(StringLen(current) > 0)
   {
      int k = ArraySize(lines);
      ArrayResize(lines, k + 1);
      lines[k] = current;
   }
   return ArraySize(lines);
}

void HidePanel()
{
   ObjectsDeleteAll(0, "OTG_P_");
   panelUntil = 0;
   ChartRedraw(0);
}

void ShowPanel(const int tradesToday)
{
   int limit = (MaxTradesPerDay > 0 ? MaxTradesPerDay : 1);
   int w = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   int h = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);

   if(ObjectFind(0, "OTG_P_BG") < 0) ObjectCreate(0, "OTG_P_BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_XDISTANCE, 0);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_YDISTANCE, 0);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_XSIZE, w);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_YSIZE, h);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_BGCOLOR, clrMaroon);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_COLOR, clrRed);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_WIDTH, 4);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, "OTG_P_BG", OBJPROP_ZORDER, 5);

   int y = 30;
   Label("OTG_P_T1", "ALTO. NO SIGAS OPERANDO.", 30, y, 26, clrWhite);
   y += 70;
   Label("OTG_P_T2", StringFormat("Hoy ya hiciste %d %s. Tu limite era %d.", tradesToday, tradesToday == 1 ? "operacion" : "operaciones", limit), 30, y, 15, clrYellow);
   y += 40;

   if(ShowHistoryStats)
   {
      int extra = 0;
      double net = 0.0;
      if(OvertradingCost(HistoryDays, extra, net) && extra >= 3 && net < 0)
      {
         Label("OTG_P_T3", StringFormat("En tus ultimos %d dias, %d operaciones de mas te costaron %.2f.", HistoryDays, extra, MathAbs(net)), 30, y, 15, clrWhite);
         y += 40;
      }
   }

   string lines[];
   int n = Wrap(MyMessage, lines);
   for(int i = 0; i < n; i++)
   {
      Label("OTG_P_M" + IntegerToString(i), lines[i], 30, y, 13, clrWhite);
      y += 30;
   }
   y += 15;
   Label("OTG_P_T9", "Cierra la plataforma. Manana hay mercado.", 30, y, 17, clrYellow);

   panelUntil = TimeLocal() + PanelSeconds;
   if(PlayAlarm) PlaySound("alert2.wav");
   ChartRedraw(0);
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
   int newAlerts = 0;
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
         newAlerts++;
         Notify(StringFormat("la operacion #%I64u supera tu limite. Cierrala tu.", tk[i]));
      }
   }

   if(closedNow > 0 || newAlerts > 0) ShowPanel(tradesToday);

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

   if(MaxTradesPerDay > 0 && tradesToday >= MaxTradesPerDay)
      Label("OTG_BANNER", "LIMITE ALCANZADO. HOY YA NO OPERAS.", 15, 25, 14, clrRed);
   else
      ObjectDelete(0, "OTG_BANNER");

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
   ObjectsDeleteAll(0, "OTG_");
   Comment("");
}

void OnTimer()
{
   if(panelUntil > 0 && TimeLocal() >= panelUntil) HidePanel();
   Enforce();
}

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD || trans.type == TRADE_TRANSACTION_ORDER_ADD)
      Enforce();
}

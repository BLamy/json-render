import { stripe, formatAmount, formatDate } from "../../stripe";

/**
 * Type for setData function
 */
type SetData = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

/**
 * Action handlers for Stripe operations
 *
 * These use the real Stripe API via the UI Extension SDK.
 */
export const actionHandlers: Record<
  string,
  (
    params: Record<string, unknown> | undefined,
    setData: SetData,
    data: Record<string, unknown>,
  ) => Promise<void>
> = {
  // ===========================================================================
  // Customer Actions
  // ===========================================================================
  fetchCustomers: async (params, setData) => {
    try {
      const customers = await stripe.customers.list({
        limit: (params?.limit as number) ?? 10,
        email: (params?.email as string) || undefined,
        starting_after: (params?.startingAfter as string) || undefined,
      });

      const data = customers.data.map((c) => ({
        id: c.id,
        name: c.name ?? c.email ?? "Unknown",
        email: c.email ?? "",
        phone: c.phone ?? "",
        status: c.delinquent ? "inactive" : "active",
        created: formatDate(c.created),
        balance: c.balance,
        currency: c.currency ?? "usd",
      }));

      setData((prev) => ({
        ...prev,
        customers: {
          data,
          total: customers.data.length,
          hasMore: customers.has_more,
        },
      }));
    } catch (error) {
      console.error("fetchCustomers error:", error);
    }
  },

  viewCustomer: async (params) => {
    if (params?.customerId) {
      window.open(
        `https://dashboard.stripe.com/customers/${params.customerId}`,
        "_blank",
      );
    }
  },

  createCustomer: async (params, setData) => {
    try {
      await stripe.customers.create({
        email: (params?.email as string) ?? "",
        name: (params?.name as string) ?? undefined,
        phone: (params?.phone as string) ?? undefined,
        description: (params?.description as string) ?? undefined,
        metadata: (params?.metadata as Record<string, string>) ?? undefined,
      });
      await actionHandlers.fetchCustomers({}, setData, {});
    } catch (error) {
      console.error("createCustomer error:", error);
    }
  },

  updateCustomer: async (params, setData) => {
    try {
      if (!params?.customerId) return;
      await stripe.customers.update(params.customerId as string, {
        email: (params?.email as string) ?? undefined,
        name: (params?.name as string) ?? undefined,
        phone: (params?.phone as string) ?? undefined,
        description: (params?.description as string) ?? undefined,
        metadata: (params?.metadata as Record<string, string>) ?? undefined,
      });
      await actionHandlers.fetchCustomers({}, setData, {});
    } catch (error) {
      console.error("updateCustomer error:", error);
    }
  },

  deleteCustomer: async (params, setData) => {
    try {
      if (!params?.customerId) return;
      await stripe.customers.del(params.customerId as string);
      await actionHandlers.fetchCustomers({}, setData, {});
    } catch (error) {
      console.error("deleteCustomer error:", error);
    }
  },

  searchCustomers: async (params, setData) => {
    try {
      const customers = await stripe.customers.search({
        query: (params?.query as string) ?? "",
        limit: (params?.limit as number) ?? 10,
      });

      const data = customers.data.map((c) => ({
        id: c.id,
        name: c.name ?? c.email ?? "Unknown",
        email: c.email ?? "",
        status: c.delinquent ? "inactive" : "active",
        created: formatDate(c.created),
      }));

      setData((prev) => ({
        ...prev,
        searchResults: { customers: data, total: customers.data.length },
      }));
    } catch (error) {
      console.error("searchCustomers error:", error);
    }
  },

  // ===========================================================================
  // Payment Intent Actions
  // ===========================================================================
  fetchPayments: async (params, setData) => {
    try {
      const payments = await stripe.paymentIntents.list({
        limit: (params?.limit as number) ?? 10,
        customer: (params?.customerId as string) || undefined,
        starting_after: (params?.startingAfter as string) || undefined,
      });

      const data = payments.data.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        description: p.description ?? `Payment ${p.id.slice(-8)}`,
        created: formatDate(p.created),
        formattedAmount: formatAmount(p.amount, p.currency),
        customerId: p.customer as string,
      }));

      const succeeded = payments.data.filter((p) => p.status === "succeeded");
      const totalVolume = succeeded.reduce((sum, p) => sum + p.amount, 0);
      const successRate =
        payments.data.length > 0
          ? ((succeeded.length / payments.data.length) * 100).toFixed(1)
          : "0";

      setData((prev) => ({
        ...prev,
        payments: {
          data,
          total: payments.data.length,
          totalVolume: formatAmount(totalVolume, "usd"),
          successRate: `${successRate}%`,
          hasMore: payments.has_more,
        },
      }));
    } catch (error) {
      console.error("fetchPayments error:", error);
    }
  },

  viewPayment: async (params) => {
    if (params?.paymentId) {
      window.open(
        `https://dashboard.stripe.com/payments/${params.paymentId}`,
        "_blank",
      );
    }
  },

  createPaymentIntent: async (params, setData) => {
    try {
      await stripe.paymentIntents.create({
        amount: (params?.amount as number) ?? 0,
        currency: (params?.currency as string) ?? "usd",
        customer: (params?.customerId as string) ?? undefined,
        description: (params?.description as string) ?? undefined,
        metadata: (params?.metadata as Record<string, string>) ?? undefined,
      });
      await actionHandlers.fetchPayments({}, setData, {});
    } catch (error) {
      console.error("createPaymentIntent error:", error);
    }
  },

  capturePayment: async (params, setData) => {
    try {
      if (!params?.paymentId) return;
      await stripe.paymentIntents.capture(params.paymentId as string, {
        amount_to_capture: (params?.amountToCapture as number) ?? undefined,
      });
      await actionHandlers.fetchPayments({}, setData, {});
    } catch (error) {
      console.error("capturePayment error:", error);
    }
  },

  cancelPayment: async (params, setData) => {
    try {
      if (!params?.paymentId) return;
      await stripe.paymentIntents.cancel(params.paymentId as string, {
        cancellation_reason:
          (params?.reason as
            | "duplicate"
            | "fraudulent"
            | "requested_by_customer"
            | "abandoned") ?? undefined,
      });
      await actionHandlers.fetchPayments({}, setData, {});
    } catch (error) {
      console.error("cancelPayment error:", error);
    }
  },

  // ===========================================================================
  // Refund Actions
  // ===========================================================================
  fetchRefunds: async (params, setData) => {
    try {
      const refunds = await stripe.refunds.list({
        limit: (params?.limit as number) ?? 10,
        payment_intent: (params?.paymentIntentId as string) || undefined,
        charge: (params?.chargeId as string) || undefined,
      });

      const data = refunds.data.map((r) => ({
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        reason: r.reason,
        created: formatDate(r.created),
        formattedAmount: formatAmount(r.amount, r.currency),
      }));

      setData((prev) => ({
        ...prev,
        refunds: { data, total: refunds.data.length },
      }));
    } catch (error) {
      console.error("fetchRefunds error:", error);
    }
  },

  refundPayment: async (params, setData) => {
    try {
      if (!params?.paymentId) return;
      await stripe.refunds.create({
        payment_intent: params.paymentId as string,
        amount: (params?.amount as number) ?? undefined,
        reason:
          (params?.reason as
            | "duplicate"
            | "fraudulent"
            | "requested_by_customer") ?? undefined,
      });
      await actionHandlers.fetchPayments({}, setData, {});
      await actionHandlers.fetchRefunds({}, setData, {});
    } catch (error) {
      console.error("refundPayment error:", error);
    }
  },

  updateRefund: async (params, setData) => {
    try {
      if (!params?.refundId) return;
      await stripe.refunds.update(params.refundId as string, {
        metadata: (params?.metadata as Record<string, string>) ?? undefined,
      });
      await actionHandlers.fetchRefunds({}, setData, {});
    } catch (error) {
      console.error("updateRefund error:", error);
    }
  },

  // ===========================================================================
  // Charge Actions
  // ===========================================================================
  fetchCharges: async (params, setData) => {
    try {
      const charges = await stripe.charges.list({
        limit: (params?.limit as number) ?? 10,
        customer: (params?.customerId as string) || undefined,
        payment_intent: (params?.paymentIntentId as string) || undefined,
      });

      const data = charges.data.map((c) => ({
        id: c.id,
        amount: c.amount,
        currency: c.currency,
        status: c.status,
        captured: c.captured,
        description: c.description,
        created: formatDate(c.created),
        formattedAmount: formatAmount(c.amount, c.currency),
      }));

      setData((prev) => ({
        ...prev,
        charges: { data, total: charges.data.length },
      }));
    } catch (error) {
      console.error("fetchCharges error:", error);
    }
  },

  captureCharge: async (params, setData) => {
    try {
      if (!params?.chargeId) return;
      await stripe.charges.capture(params.chargeId as string, {
        amount: (params?.amount as number) ?? undefined,
      });
      await actionHandlers.fetchCharges({}, setData, {});
    } catch (error) {
      console.error("captureCharge error:", error);
    }
  },

  // ===========================================================================
  // Subscription Actions
  // ===========================================================================
  fetchSubscriptions: async (params, setData) => {
    try {
      const subscriptions = await stripe.subscriptions.list({
        limit: (params?.limit as number) ?? 10,
        status: (params?.status as string) || undefined,
        customer: (params?.customerId as string) || undefined,
        price: (params?.priceId as string) || undefined,
      });

      const data = subscriptions.data.map((s) => ({
        id: s.id,
        planName:
          s.items.data[0]?.price?.nickname ??
          s.items.data[0]?.price?.id ??
          "Plan",
        status: s.status,
        amount: s.items.data[0]?.price?.unit_amount ?? 0,
        currency: s.items.data[0]?.price?.currency ?? "usd",
        interval: s.items.data[0]?.price?.recurring?.interval ?? "month",
        customerId: s.customer as string,
        currentPeriodEnd: formatDate(s.current_period_end),
        cancelAtPeriodEnd: s.cancel_at_period_end,
      }));

      const active = subscriptions.data.filter(
        (s) => s.status === "active",
      ).length;
      const trialing = subscriptions.data.filter(
        (s) => s.status === "trialing",
      ).length;
      const pastDue = subscriptions.data.filter(
        (s) => s.status === "past_due",
      ).length;
      const canceled = subscriptions.data.filter(
        (s) => s.status === "canceled",
      ).length;

      setData((prev) => ({
        ...prev,
        subscriptions: {
          data,
          total: subscriptions.data.length,
          active,
          trialing,
          pastDue,
          canceled,
          hasMore: subscriptions.has_more,
        },
      }));
    } catch (error) {
      console.error("fetchSubscriptions error:", error);
    }
  },

  viewSubscription: async (params) => {
    if (params?.subscriptionId) {
      window.open(
        `https://dashboard.stripe.com/subscriptions/${params.subscriptionId}`,
        "_blank",
      );
    }
  },

  createSubscription: async (params, setData) => {
    try {
      if (!params?.customerId || !params?.priceId) return;
      await stripe.subscriptions.create({
        customer: params.customerId as string,
        items: [
          {
            price: params.priceId as string,
            quantity: (params?.quantity as number) ?? 1,
          },
        ],
        trial_period_days: (params?.trialPeriodDays as number) ?? undefined,
        metadata: (params?.metadata as Record<string, string>) ?? undefined,
      });
      await actionHandlers.fetchSubscriptions({}, setData, {});
    } catch (error) {
      console.error("createSubscription error:", error);
    }
  },

  updateSubscription: async (params, setData) => {
    try {
      if (!params?.subscriptionId) return;
      const updateParams: Record<string, unknown> = {};
      if (params.priceId) {
        updateParams.items = [
          {
            price: params.priceId as string,
            quantity: (params?.quantity as number) ?? 1,
          },
        ];
      }
      if (params.metadata) {
        updateParams.metadata = params.metadata;
      }
      await stripe.subscriptions.update(
        params.subscriptionId as string,
        updateParams,
      );
      await actionHandlers.fetchSubscriptions({}, setData, {});
    } catch (error) {
      console.error("updateSubscription error:", error);
    }
  },

  cancelSubscription: async (params, setData) => {
    try {
      if (!params?.subscriptionId) return;
      if (params.immediately) {
        await stripe.subscriptions.cancel(params.subscriptionId as string);
      } else {
        await stripe.subscriptions.update(params.subscriptionId as string, {
          cancel_at_period_end: true,
        });
      }
      await actionHandlers.fetchSubscriptions({}, setData, {});
    } catch (error) {
      console.error("cancelSubscription error:", error);
    }
  },

  pauseSubscription: async (params, setData) => {
    try {
      if (!params?.subscriptionId) return;
      await stripe.subscriptions.update(params.subscriptionId as string, {
        pause_collection: {
          behavior: "mark_uncollectible",
          resumes_at: (params?.resumeAt as number) ?? undefined,
        },
      });
      await actionHandlers.fetchSubscriptions({}, setData, {});
    } catch (error) {
      console.error("pauseSubscription error:", error);
    }
  },

  resumeSubscription: async (params, setData) => {
    try {
      if (!params?.subscriptionId) return;
      await stripe.subscriptions.update(params.subscriptionId as string, {
        pause_collection: "",
      });
      await actionHandlers.fetchSubscriptions({}, setData, {});
    } catch (error) {
      console.error("resumeSubscription error:", error);
    }
  },

  // ===========================================================================
  // Invoice Actions
  // ===========================================================================
  fetchInvoices: async (params, setData) => {
    try {
      const invoices = await stripe.invoices.list({
        limit: (params?.limit as number) ?? 10,
        status: (params?.status as string) || undefined,
        customer: (params?.customerId as string) || undefined,
        subscription: (params?.subscriptionId as string) || undefined,
      });

      const data = invoices.data.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.number ?? inv.id.slice(-8),
        amount: inv.amount_due,
        currency: inv.currency,
        status: inv.status ?? "draft",
        dueDate: inv.due_date ? formatDate(inv.due_date) : null,
        customerEmail: inv.customer_email ?? "",
        formattedAmount: formatAmount(inv.amount_due, inv.currency),
        hostedInvoiceUrl: inv.hosted_invoice_url,
        pdfUrl: inv.invoice_pdf,
      }));

      const outstanding = invoices.data
        .filter((i) => i.status === "open")
        .reduce((sum, i) => sum + i.amount_due, 0);
      const paid = invoices.data
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + i.amount_paid, 0);
      const overdue = invoices.data
        .filter(
          (i) =>
            i.status === "open" && i.due_date && i.due_date < Date.now() / 1000,
        )
        .reduce((sum, i) => sum + i.amount_due, 0);

      setData((prev) => ({
        ...prev,
        invoices: {
          data,
          total: invoices.data.length,
          outstanding: formatAmount(outstanding, "usd"),
          paid: formatAmount(paid, "usd"),
          overdue: formatAmount(overdue, "usd"),
          hasMore: invoices.has_more,
        },
      }));
    } catch (error) {
      console.error("fetchInvoices error:", error);
    }
  },

  viewInvoice: async (params) => {
    if (params?.invoiceId) {
      window.open(
        `https://dashboard.stripe.com/invoices/${params.invoiceId}`,
        "_blank",
      );
    }
  },

  createInvoice: async (params, setData) => {
    try {
      if (!params?.customerId) return;
      await stripe.invoices.create({
        customer: params.customerId as string,
        description: (params?.description as string) ?? undefined,
        days_until_due: (params?.daysUntilDue as number) ?? undefined,
        metadata: (params?.metadata as Record<string, string>) ?? undefined,
      });
      await actionHandlers.fetchInvoices({}, setData, {});
    } catch (error) {
      console.error("createInvoice error:", error);
    }
  },

  addInvoiceItem: async (params, setData) => {
    try {
      if (!params?.invoiceId) return;
      await stripe.invoiceItems.create({
        invoice: params.invoiceId as string,
        amount: (params?.amount as number) ?? 0,
        currency: (params?.currency as string) ?? "usd",
        description: (params?.description as string) ?? undefined,
      });
      await actionHandlers.fetchInvoices({}, setData, {});
    } catch (error) {
      console.error("addInvoiceItem error:", error);
    }
  },

  finalizeInvoice: async (params, setData) => {
    try {
      if (!params?.invoiceId) return;
      await stripe.invoices.finalizeInvoice(params.invoiceId as string, {
        auto_advance: (params?.autoAdvance as boolean) ?? undefined,
      });
      await actionHandlers.fetchInvoices({}, setData, {});
    } catch (error) {
      console.error("finalizeInvoice error:", error);
    }
  },

  sendInvoice: async (params, setData) => {
    try {
      if (!params?.invoiceId) return;
      await stripe.invoices.sendInvoice(params.invoiceId as string);
      await actionHandlers.fetchInvoices({}, setData, {});
    } catch (error) {
      console.error("sendInvoice error:", error);
    }
  },

  payInvoice: async (params, setData) => {
    try {
      if (!params?.invoiceId) return;
      await stripe.invoices.pay(params.invoiceId as string, {
        payment_method: (params?.paymentMethodId as string) ?? undefined,
      });
      await actionHandlers.fetchInvoices({}, setData, {});
    } catch (error) {
      console.error("payInvoice error:", error);
    }
  },

  voidInvoice: async (params, setData) => {
    try {
      if (!params?.invoiceId) return;
      await stripe.invoices.voidInvoice(params.invoiceId as string);
      await actionHandlers.fetchInvoices({}, setData, {});
    } catch (error) {
      console.error("voidInvoice error:", error);
    }
  },

  markInvoiceUncollectible: async (params, setData) => {
    try {
      if (!params?.invoiceId) return;
      await stripe.invoices.markUncollectible(params.invoiceId as string);
      await actionHandlers.fetchInvoices({}, setData, {});
    } catch (error) {
      console.error("markInvoiceUncollectible error:", error);
    }
  },

  downloadInvoicePdf: async (params, _, data) => {
    try {
      if (!params?.invoiceId) return;
      const invoices =
        (data.invoices as { data: Array<{ id: string; pdfUrl: string }> })
          ?.data ?? [];
      const invoice = invoices.find((i) => i.id === params.invoiceId);
      if (invoice?.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank");
      }
    } catch (error) {
      console.error("downloadInvoicePdf error:", error);
    }
  },

  // ===========================================================================
  // Product & Price Actions
  // ===========================================================================
  fetchProducts: async (params, setData) => {
    try {
      const products = await stripe.products.list({
        limit: (params?.limit as number) ?? 10,
        active: (params?.active as boolean) ?? undefined,
      });

      const data = products.data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        active: p.active,
        created: formatDate(p.created),
        images: p.images,
      }));

      setData((prev) => ({
        ...prev,
        products: {
          data,
          total: products.data.length,
          hasMore: products.has_more,
        },
      }));
    } catch (error) {
      console.error("fetchProducts error:", error);
    }
  },

  viewProduct: async (params) => {
    if (params?.productId) {
      window.open(
        `https://dashboard.stripe.com/products/${params.productId}`,
        "_blank",
      );
    }
  },

  createProduct: async (params, setData) => {
    try {
      if (!params?.name) return;
      await stripe.products.create({
        name: params.name as string,
        description: (params?.description as string) ?? undefined,
        active: (params?.active as boolean) ?? true,
        metadata: (params?.metadata as Record<string, string>) ?? undefined,
      });
      await actionHandlers.fetchProducts({}, setData, {});
    } catch (error) {
      console.error("createProduct error:", error);
    }
  },

  updateProduct: async (params, setData) => {
    try {
      if (!params?.productId) return;
      await stripe.products.update(params.productId as string, {
        name: (params?.name as string) ?? undefined,
        description: (params?.description as string) ?? undefined,
        active: (params?.active as boolean) ?? undefined,
        metadata: (params?.metadata as Record<string, string>) ?? undefined,
      });
      await actionHandlers.fetchProducts({}, setData, {});
    } catch (error) {
      console.error("updateProduct error:", error);
    }
  },

  archiveProduct: async (params, setData) => {
    try {
      if (!params?.productId) return;
      await stripe.products.update(params.productId as string, {
        active: false,
      });
      await actionHandlers.fetchProducts({}, setData, {});
    } catch (error) {
      console.error("archiveProduct error:", error);
    }
  },

  fetchPrices: async (params, setData) => {
    try {
      const prices = await stripe.prices.list({
        limit: (params?.limit as number) ?? 10,
        product: (params?.productId as string) || undefined,
        active: (params?.active as boolean) ?? undefined,
        type: (params?.type as "one_time" | "recurring") || undefined,
      });

      const data = prices.data.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        unitAmount: p.unit_amount,
        currency: p.currency,
        active: p.active,
        type: p.type,
        recurring: p.recurring,
        formattedAmount: formatAmount(p.unit_amount ?? 0, p.currency),
        productId: typeof p.product === "string" ? p.product : p.product?.id,
      }));

      setData((prev) => ({
        ...prev,
        prices: { data, total: prices.data.length, hasMore: prices.has_more },
      }));
    } catch (error) {
      console.error("fetchPrices error:", error);
    }
  },

  createPrice: async (params, setData) => {
    try {
      if (!params?.productId || !params?.unitAmount) return;
      const recurring = params?.recurring as
        | { interval: string; intervalCount?: number }
        | undefined;
      await stripe.prices.create({
        product: params.productId as string,
        unit_amount: params.unitAmount as number,
        currency: (params?.currency as string) ?? "usd",
        recurring: recurring
          ? {
              interval: recurring.interval as "day" | "week" | "month" | "year",
              interval_count: recurring.intervalCount ?? undefined,
            }
          : undefined,
        nickname: (params?.nickname as string) ?? undefined,
      });
      await actionHandlers.fetchPrices({}, setData, {});
    } catch (error) {
      console.error("createPrice error:", error);
    }
  },

  updatePrice: async (params, setData) => {
    try {
      if (!params?.priceId) return;
      await stripe.prices.update(params.priceId as string, {
        active: (params?.active as boolean) ?? undefined,
        nickname: (params?.nickname as string) ?? undefined,
        metadata: (params?.metadata as Record<string, string>) ?? undefined,
      });
      await actionHandlers.fetchPrices({}, setData, {});
    } catch (error) {
      console.error("updatePrice error:", error);
    }
  },

  // ===========================================================================
  // Balance & Payout Actions
  // ===========================================================================
  fetchBalance: async (_, setData) => {
    try {
      const balance = await stripe.balance.retrieve();

      const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
      const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0);

      setData((prev) => ({
        ...prev,
        balance: {
          available,
          pending,
          formattedAvailable: formatAmount(available, "usd"),
          formattedPending: formatAmount(pending, "usd"),
          currency: balance.available[0]?.currency ?? "usd",
        },
      }));
    } catch (error) {
      console.error("fetchBalance error:", error);
    }
  },

  fetchPayouts: async (params, setData) => {
    try {
      const payouts = await stripe.payouts.list({
        limit: (params?.limit as number) ?? 10,
        status: (params?.status as string) || undefined,
      });

      const data = payouts.data.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        arrivalDate: formatDate(p.arrival_date),
        created: formatDate(p.created),
        formattedAmount: formatAmount(p.amount, p.currency),
      }));

      setData((prev) => ({
        ...prev,
        payouts: {
          data,
          total: payouts.data.length,
          hasMore: payouts.has_more,
        },
      }));
    } catch (error) {
      console.error("fetchPayouts error:", error);
    }
  },

  createPayout: async (params, setData) => {
    try {
      if (!params?.amount) return;
      await stripe.payouts.create({
        amount: params.amount as number,
        currency: (params?.currency as string) ?? "usd",
        description: (params?.description as string) ?? undefined,
      });
      await actionHandlers.fetchPayouts({}, setData, {});
      await actionHandlers.fetchBalance({}, setData, {});
    } catch (error) {
      console.error("createPayout error:", error);
    }
  },

  cancelPayout: async (params, setData) => {
    try {
      if (!params?.payoutId) return;
      await stripe.payouts.cancel(params.payoutId as string);
      await actionHandlers.fetchPayouts({}, setData, {});
    } catch (error) {
      console.error("cancelPayout error:", error);
    }
  },

  // ===========================================================================
  // Dispute Actions
  // ===========================================================================
  fetchDisputes: async (params, setData) => {
    try {
      const disputes = await stripe.disputes.list({
        limit: (params?.limit as number) ?? 10,
        charge: (params?.chargeId as string) || undefined,
      });

      const data = disputes.data.map((d) => ({
        id: d.id,
        amount: d.amount,
        currency: d.currency,
        status: d.status,
        reason: d.reason,
        created: formatDate(d.created),
        formattedAmount: formatAmount(d.amount, d.currency),
        evidenceDueBy: d.evidence_details?.due_by
          ? formatDate(d.evidence_details.due_by)
          : null,
      }));

      setData((prev) => ({
        ...prev,
        disputes: {
          data,
          total: disputes.data.length,
          hasMore: disputes.has_more,
        },
      }));
    } catch (error) {
      console.error("fetchDisputes error:", error);
    }
  },

  viewDispute: async (params) => {
    if (params?.disputeId) {
      window.open(
        `https://dashboard.stripe.com/disputes/${params.disputeId}`,
        "_blank",
      );
    }
  },

  updateDispute: async (params, setData) => {
    try {
      if (!params?.disputeId) return;
      const evidence = params?.evidence as Record<string, string> | undefined;
      await stripe.disputes.update(params.disputeId as string, {
        evidence: evidence
          ? {
              customer_name: evidence.customerName ?? undefined,
              customer_email_address:
                evidence.customerEmailAddress ?? undefined,
              product_description: evidence.productDescription ?? undefined,
              uncategorized_text: evidence.uncategorizedText ?? undefined,
            }
          : undefined,
        submit: (params?.submit as boolean) ?? undefined,
      });
      await actionHandlers.fetchDisputes({}, setData, {});
    } catch (error) {
      console.error("updateDispute error:", error);
    }
  },

  closeDispute: async (params, setData) => {
    try {
      if (!params?.disputeId) return;
      await stripe.disputes.close(params.disputeId as string);
      await actionHandlers.fetchDisputes({}, setData, {});
    } catch (error) {
      console.error("closeDispute error:", error);
    }
  },

  // ===========================================================================
  // Payment Method Actions
  // ===========================================================================
  fetchPaymentMethods: async (params, setData) => {
    try {
      if (!params?.customerId) return;
      const paymentMethods = await stripe.paymentMethods.list({
        customer: params.customerId as string,
        type: (params?.type as "card" | "us_bank_account") || "card",
      });

      const data = paymentMethods.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          : null,
        created: formatDate(pm.created),
      }));

      setData((prev) => ({
        ...prev,
        paymentMethods: { data, total: paymentMethods.data.length },
      }));
    } catch (error) {
      console.error("fetchPaymentMethods error:", error);
    }
  },

  attachPaymentMethod: async (params, setData) => {
    try {
      if (!params?.paymentMethodId || !params?.customerId) return;
      await stripe.paymentMethods.attach(params.paymentMethodId as string, {
        customer: params.customerId as string,
      });
      await actionHandlers.fetchPaymentMethods(
        { customerId: params.customerId },
        setData,
        {},
      );
    } catch (error) {
      console.error("attachPaymentMethod error:", error);
    }
  },

  detachPaymentMethod: async (params, _setData) => {
    try {
      if (!params?.paymentMethodId) return;
      await stripe.paymentMethods.detach(params.paymentMethodId as string);
    } catch (error) {
      console.error("detachPaymentMethod error:", error);
    }
  },

  setDefaultPaymentMethod: async (params, setData) => {
    try {
      if (!params?.customerId || !params?.paymentMethodId) return;
      await stripe.customers.update(params.customerId as string, {
        invoice_settings: {
          default_payment_method: params.paymentMethodId as string,
        },
      });
      await actionHandlers.fetchCustomers({}, setData, {});
    } catch (error) {
      console.error("setDefaultPaymentMethod error:", error);
    }
  },

  // ===========================================================================
  // Coupon & Promotion Actions
  // ===========================================================================
  fetchCoupons: async (params, setData) => {
    try {
      const coupons = await stripe.coupons.list({
        limit: (params?.limit as number) ?? 10,
      });

      const data = coupons.data.map((c) => ({
        id: c.id,
        name: c.name,
        percentOff: c.percent_off,
        amountOff: c.amount_off,
        currency: c.currency,
        duration: c.duration,
        durationInMonths: c.duration_in_months,
        maxRedemptions: c.max_redemptions,
        timesRedeemed: c.times_redeemed,
        valid: c.valid,
      }));

      setData((prev) => ({
        ...prev,
        coupons: { data, total: coupons.data.length },
      }));
    } catch (error) {
      console.error("fetchCoupons error:", error);
    }
  },

  createCoupon: async (params, setData) => {
    try {
      await stripe.coupons.create({
        percent_off: (params?.percentOff as number) ?? undefined,
        amount_off: (params?.amountOff as number) ?? undefined,
        currency: (params?.currency as string) ?? undefined,
        duration:
          (params?.duration as "forever" | "once" | "repeating") ?? "once",
        duration_in_months: (params?.durationInMonths as number) ?? undefined,
        name: (params?.name as string) ?? undefined,
        max_redemptions: (params?.maxRedemptions as number) ?? undefined,
      });
      await actionHandlers.fetchCoupons({}, setData, {});
    } catch (error) {
      console.error("createCoupon error:", error);
    }
  },

  deleteCoupon: async (params, setData) => {
    try {
      if (!params?.couponId) return;
      await stripe.coupons.del(params.couponId as string);
      await actionHandlers.fetchCoupons({}, setData, {});
    } catch (error) {
      console.error("deleteCoupon error:", error);
    }
  },

  fetchPromotionCodes: async (params, setData) => {
    try {
      const promoCodes = await stripe.promotionCodes.list({
        limit: (params?.limit as number) ?? 10,
        coupon: (params?.couponId as string) || undefined,
        active: (params?.active as boolean) ?? undefined,
      });

      const data = promoCodes.data.map((p) => ({
        id: p.id,
        code: p.code,
        couponId: typeof p.coupon === "string" ? p.coupon : p.coupon?.id,
        active: p.active,
        maxRedemptions: p.max_redemptions,
        timesRedeemed: p.times_redeemed,
        expiresAt: p.expires_at ? formatDate(p.expires_at) : null,
      }));

      setData((prev) => ({
        ...prev,
        promotionCodes: { data, total: promoCodes.data.length },
      }));
    } catch (error) {
      console.error("fetchPromotionCodes error:", error);
    }
  },

  createPromotionCode: async (params, setData) => {
    try {
      if (!params?.couponId) return;
      await stripe.promotionCodes.create({
        coupon: params.couponId as string,
        code: (params?.code as string) ?? undefined,
        max_redemptions: (params?.maxRedemptions as number) ?? undefined,
        expires_at: (params?.expiresAt as number) ?? undefined,
      });
      await actionHandlers.fetchPromotionCodes({}, setData, {});
    } catch (error) {
      console.error("createPromotionCode error:", error);
    }
  },

  // ===========================================================================
  // Checkout Session Actions
  // ===========================================================================
  createCheckoutSession: async (params, setData) => {
    try {
      const lineItems =
        (params?.lineItems as Array<{ priceId: string; quantity: number }>) ??
        [];
      const session = await stripe.checkout.sessions.create({
        mode:
          (params?.mode as "payment" | "subscription" | "setup") ?? "payment",
        line_items: lineItems.map((li) => ({
          price: li.priceId,
          quantity: li.quantity,
        })),
        success_url: (params?.successUrl as string) ?? "",
        cancel_url: (params?.cancelUrl as string) ?? "",
        customer: (params?.customerId as string) ?? undefined,
      });

      setData((prev) => ({
        ...prev,
        checkoutSession: { id: session.id, url: session.url },
      }));

      if (session.url) {
        window.open(session.url, "_blank");
      }
    } catch (error) {
      console.error("createCheckoutSession error:", error);
    }
  },

  fetchCheckoutSessions: async (params, setData) => {
    try {
      const sessions = await stripe.checkout.sessions.list({
        limit: (params?.limit as number) ?? 10,
        customer: (params?.customerId as string) || undefined,
        payment_intent: (params?.paymentIntentId as string) || undefined,
      });

      const data = sessions.data.map((s) => ({
        id: s.id,
        mode: s.mode,
        status: s.status,
        amountTotal: s.amount_total,
        currency: s.currency,
        customerEmail: s.customer_email,
        url: s.url,
        created: formatDate(s.created),
      }));

      setData((prev) => ({
        ...prev,
        checkoutSessions: { data, total: sessions.data.length },
      }));
    } catch (error) {
      console.error("fetchCheckoutSessions error:", error);
    }
  },

  expireCheckoutSession: async (params, setData) => {
    try {
      if (!params?.sessionId) return;
      await stripe.checkout.sessions.expire(params.sessionId as string);
      await actionHandlers.fetchCheckoutSessions({}, setData, {});
    } catch (error) {
      console.error("expireCheckoutSession error:", error);
    }
  },

  // ===========================================================================
  // Billing Portal Actions
  // ===========================================================================
  createBillingPortalSession: async (params, setData) => {
    try {
      if (!params?.customerId) return;
      const session = await stripe.billingPortal.sessions.create({
        customer: params.customerId as string,
        return_url: (params?.returnUrl as string) ?? window.location.href,
      });

      setData((prev) => ({
        ...prev,
        billingPortalSession: { url: session.url },
      }));

      if (session.url) {
        window.open(session.url, "_blank");
      }
    } catch (error) {
      console.error("createBillingPortalSession error:", error);
    }
  },

  // ===========================================================================
  // Event Actions
  // ===========================================================================
  fetchEvents: async (params, setData) => {
    try {
      const events = await stripe.events.list({
        limit: (params?.limit as number) ?? 10,
        type: (params?.type as string) || undefined,
        created: {
          gte: (params?.createdGte as number) || undefined,
          lte: (params?.createdLte as number) || undefined,
        },
      });

      const data = events.data.map((e) => ({
        id: e.id,
        type: e.type,
        created: formatDate(e.created),
        livemode: e.livemode,
      }));

      setData((prev) => ({
        ...prev,
        events: { data, total: events.data.length, hasMore: events.has_more },
      }));
    } catch (error) {
      console.error("fetchEvents error:", error);
    }
  },

  // ===========================================================================
  // Setup Intent Actions
  // ===========================================================================
  createSetupIntent: async (params, setData) => {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: (params?.customerId as string) ?? undefined,
        payment_method_types: (params?.paymentMethodTypes as string[]) ?? [
          "card",
        ],
        usage: (params?.usage as "on_session" | "off_session") ?? "off_session",
      });

      setData((prev) => ({
        ...prev,
        setupIntent: {
          id: setupIntent.id,
          clientSecret: setupIntent.client_secret,
        },
      }));
    } catch (error) {
      console.error("createSetupIntent error:", error);
    }
  },

  fetchSetupIntents: async (params, setData) => {
    try {
      const setupIntents = await stripe.setupIntents.list({
        limit: (params?.limit as number) ?? 10,
        customer: (params?.customerId as string) || undefined,
      });

      const data = setupIntents.data.map((si) => ({
        id: si.id,
        status: si.status,
        usage: si.usage,
        created: formatDate(si.created),
        paymentMethodTypes: si.payment_method_types,
      }));

      setData((prev) => ({
        ...prev,
        setupIntents: { data, total: setupIntents.data.length },
      }));
    } catch (error) {
      console.error("fetchSetupIntents error:", error);
    }
  },

  cancelSetupIntent: async (params, setData) => {
    try {
      if (!params?.setupIntentId) return;
      await stripe.setupIntents.cancel(params.setupIntentId as string);
      await actionHandlers.fetchSetupIntents({}, setData, {});
    } catch (error) {
      console.error("cancelSetupIntent error:", error);
    }
  },

  // ===========================================================================
  // Tax Rate Actions
  // ===========================================================================
  fetchTaxRates: async (params, setData) => {
    try {
      const taxRates = await stripe.taxRates.list({
        limit: (params?.limit as number) ?? 10,
        active: (params?.active as boolean) ?? undefined,
        inclusive: (params?.inclusive as boolean) ?? undefined,
      });

      const data = taxRates.data.map((tr) => ({
        id: tr.id,
        displayName: tr.display_name,
        percentage: tr.percentage,
        inclusive: tr.inclusive,
        jurisdiction: tr.jurisdiction,
        description: tr.description,
        active: tr.active,
      }));

      setData((prev) => ({
        ...prev,
        taxRates: { data, total: taxRates.data.length },
      }));
    } catch (error) {
      console.error("fetchTaxRates error:", error);
    }
  },

  createTaxRate: async (params, setData) => {
    try {
      if (!params?.displayName || params?.percentage === undefined) return;
      await stripe.taxRates.create({
        display_name: params.displayName as string,
        percentage: params.percentage as number,
        inclusive: (params?.inclusive as boolean) ?? false,
        jurisdiction: (params?.jurisdiction as string) ?? undefined,
        description: (params?.description as string) ?? undefined,
      });
      await actionHandlers.fetchTaxRates({}, setData, {});
    } catch (error) {
      console.error("createTaxRate error:", error);
    }
  },

  // ===========================================================================
  // Data & Refresh Actions
  // ===========================================================================
  refreshData: async (_, setData) => {
    await Promise.all([
      actionHandlers.fetchCustomers({}, setData, {}),
      actionHandlers.fetchPayments({}, setData, {}),
      actionHandlers.fetchSubscriptions({}, setData, {}),
      actionHandlers.fetchInvoices({}, setData, {}),
    ]);
  },

  refreshCustomers: async (_, setData) => {
    await actionHandlers.fetchCustomers({}, setData, {});
  },

  refreshPayments: async (_, setData) => {
    await actionHandlers.fetchPayments({}, setData, {});
  },

  refreshSubscriptions: async (_, setData) => {
    await actionHandlers.fetchSubscriptions({}, setData, {});
  },

  refreshInvoices: async (_, setData) => {
    await actionHandlers.fetchInvoices({}, setData, {});
  },

  exportData: async (params, _, data) => {
    try {
      const format = (params?.format as string) ?? "json";
      const dataType = (params?.dataType as string) ?? "customers";
      const exportData = (data[dataType] as { data: unknown[] })?.data ?? [];

      if (format === "json") {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${dataType}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "csv") {
        if (exportData.length === 0) return;
        const headers = Object.keys(exportData[0] as object);
        const csv = [
          headers.join(","),
          ...exportData.map((row) =>
            headers
              .map((h) =>
                JSON.stringify((row as Record<string, unknown>)[h] ?? ""),
              )
              .join(","),
          ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${dataType}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("exportData error:", error);
    }
  },

  // ===========================================================================
  // Navigation Actions
  // ===========================================================================
  navigate: async (params) => {
    if (params?.path) {
      console.log("Navigate to:", params.path);
      // In a real app, this would use the router
    }
  },

  openDashboard: async (params) => {
    const page = (params?.page as string) ?? "home";
    const paths: Record<string, string> = {
      home: "",
      payments: "payments",
      customers: "customers",
      products: "products",
      subscriptions: "subscriptions",
      invoices: "invoices",
      connect: "connect/accounts",
      reports: "reports",
      developers: "developers",
    };
    window.open(`https://dashboard.stripe.com/${paths[page] ?? ""}`, "_blank");
  },

  openExternalLink: async (params) => {
    if (params?.url) {
      window.open(params.url as string, "_blank");
    }
  },

  // ===========================================================================
  // Form Actions
  // ===========================================================================
  submitForm: async (params, _, data) => {
    console.log("Submit form:", params?.formId, data);
    // Implementation depends on form handling logic
  },

  resetForm: async (params, setData) => {
    const formId = params?.formId as string;
    if (formId) {
      setData((prev) => ({ ...prev, [formId]: {} }));
    }
  },

  validateForm: async (params, _, data) => {
    console.log("Validate form:", params?.formId, data);
    return;
  },

  setFormValue: async (params, setData) => {
    if (params?.path) {
      setData((prev) => ({ ...prev, [params.path as string]: params?.value }));
    }
  },

  // ===========================================================================
  // UI Actions
  // ===========================================================================
  showToast: async (params) => {
    // In UIXT, you would use the showToast API from the SDK
    console.log("Toast:", params?.type, params?.message);
  },

  copyToClipboard: async (params) => {
    if (params?.text) {
      await navigator.clipboard.writeText(params.text as string);
    }
  },

  setLoading: async (params, setData) => {
    setData((prev) => ({
      ...prev,
      loading: params?.loading,
      loadingMessage: params?.message,
    }));
  },

  // ===========================================================================
  // Filter & Sort Actions
  // ===========================================================================
  setFilter: async (params, setData) => {
    if (params?.key) {
      setData((prev) => ({
        ...prev,
        filters: {
          ...(prev.filters as Record<string, unknown>),
          [params.key as string]: params?.value,
        },
      }));
    }
  },

  clearFilters: async (_, setData) => {
    setData((prev) => ({ ...prev, filters: {} }));
  },

  setSort: async (params, setData) => {
    setData((prev) => ({
      ...prev,
      sort: { field: params?.field, direction: params?.direction },
    }));
  },

  setPageSize: async (params, setData) => {
    setData((prev) => ({ ...prev, pageSize: params?.size }));
  },

  goToPage: async (params, setData) => {
    setData((prev) => ({ ...prev, currentPage: params?.page }));
  },
};

// =============================================================================
// Execute Action
// =============================================================================

type SetDataFn = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

/**
 * Execute an action by name with the given parameters.
 */
export async function executeAction(
  actionName: string,
  params: Record<string, unknown> | undefined,
  setData: SetDataFn,
  data: Record<string, unknown> = {},
): Promise<void> {
  const handler = actionHandlers[actionName];
  if (handler) {
    await handler(params, setData, data);
  } else {
    console.log("Unknown action:", actionName, params);
  }
}

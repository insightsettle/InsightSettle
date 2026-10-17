export type AuctionOfferEvent = { event: 'offered' | 'ended'; dealId: string; ref: string; email: string; title: string; token?: string; deadline?: string };

/** Each email corresponds to one persisted bidder event; managed delivery dedupes retries. */
export async function deliverAuctionEvents(events: AuctionOfferEvent[]) {
  const { sendTemplateEmail } = await import('./email-templates/send-email');
  let failed = 0;
  for (const event of events) {
    try {
      await sendTemplateEmail('auction-offer', event.email, {
        templateData: { title: event.title, ended: event.event === 'ended', deadline: event.deadline ?? '', link: event.token ? `https://insightsettle.com/invite/${event.token}` : '' },
        idempotencyKey: `auction-${event.dealId}-${event.event}`,
      });
    } catch {
      // Offers remain committed; never duplicate financial transitions to retry email delivery.
      failed++;
      console.error('Auction event email could not be submitted', event.dealId, event.event);
    }
  }
  return { failed };
}

export async function sweepAuctionDeadlines(admin: any) {
  const { data, error } = await admin.rpc('sweep_auction_deadlines');
  if (error) throw error;
  const events = (data ?? []) as AuctionOfferEvent[];
  const delivery = await deliverAuctionEvents(events);
  return { events: events.length, emailFailures: delivery.failed };
}
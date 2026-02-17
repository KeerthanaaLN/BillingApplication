namespace billingApp.srv;

using billingApp.db as db from '../db/model';

service BillingService {
    entity Dealer as projection on db.Dealers;
    entity Model as projection on db.Models;
}
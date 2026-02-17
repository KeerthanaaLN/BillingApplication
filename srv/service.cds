namespace billingApp.srv;

using billingApp.db as db from '../db/model';

service BillingServcie{
    entity Dealer as projection on db.Dealers;
    entity Model as projection on db.Models;
    entity Allocations as projection on db.Allocations;
    entity ModelColors as projection on db.ModelColors;
}


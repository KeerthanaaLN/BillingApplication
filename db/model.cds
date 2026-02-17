namespace billingApp.db;

using { cuid, managed } from '@sap/cds/common';


// DEALER
entity Dealers : cuid, managed {

    key dealerID     : String(10);
    dealerName       : String(100);

    fundAvailability : Decimal(15,2);
    limitAvailability: Decimal(15,2);
    infOtherAmount  : Decimal(15,2);

    allocations      : Association to many Allocations
                        on allocations.dealer = $self;
}


// MODEL
entity Models : cuid, managed {

    modelCode     : String(20);
    modelDesc     : String(200);

    depotStock    : Integer;
    allocatedQty  : Integer default 0;

    availableStock : Integer default 0;

    perBikeValue  : Decimal(15,2);

    allocations   : Association to many Allocations
                     on allocations.model = $self;

    colors        : Association to one ModelColors
                     on colors.model = $self;
}


// DEALER MODEL ALLOCATION
entity Allocations : cuid, managed {

    dealer        : Association to Dealers;
    model         : Association to Models;

    orderQty      : Integer;
    allocationQty : Integer;

    fundRequired  : Decimal(15,2) @readonly;

    orderValue    : Decimal(15,2) @readonly;
}


// MODEL COLOR
entity ModelColors : cuid {

    model              : Association to Models;

    fst                : Integer default 0;
    black              : Integer default 0;
    red                : Integer default 0;
    yellow             : Integer default 0;
    green              : Integer default 0;

    rationalAllocation : Integer default 0;
    snopAllocation     : Integer default 0;
    svpoAllocation     : Integer default 0;
    totalAllocation    : Integer default 0;
}

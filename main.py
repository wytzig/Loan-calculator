import math


def calculate_loan_with_grace_and_equal_principal():
    """
    Calculate loan with grace period and equal principal installments
    """
    print("=== Loan Calculator: Grace Period + Equal Principal Installments ===\n")

    try:
        # Get user inputs
        principal = float(input("Enter the loan amount (€): "))
        total_months = int(input("Enter total loan period (months): "))
        annual_rate = float(input("Enter the nominal annual interest rate (%): "))
        grace_months = int(input("Enter grace period in months (so 12 is 1 year) (interest-only): "))

        # Calculate quarterly rate
        quarterly_rate = annual_rate / 100 / 4

        # Grace period calculations
        grace_quarters = grace_months // 3
        quarterly_interest_only = principal * quarterly_rate
        total_grace_interest = quarterly_interest_only * grace_quarters

        # Amortization period calculations
        remaining_months = total_months - grace_months
        amortization_quarters = remaining_months // 3

        # Fixed principal payment per quarter (equal installments)
        principal_per_quarter = principal / amortization_quarters

        print(f"\n=== LOAN STRUCTURE ===")
        print(f"Total loan: €{principal:,.2f}")
        print(f"Total period: {total_months} months")
        print(f"Annual rate: {annual_rate}%")
        print(f"Quarterly rate: {quarterly_rate * 100:.4f}%")

        print(f"\nGrace period: {grace_months} months ({grace_quarters} quarters)")
        print(f"Amortization period: {remaining_months} months ({amortization_quarters} quarters)")
        print(f"Principal per quarter: €{principal_per_quarter:.2f}")

        # Calculate amortization schedule
        remaining_balance = principal
        total_amortization_interest = 0

        print(f"\n=== QUARTERLY PAYMENT SCHEDULE ===")
        print(f"{'Quarter':<8} {'Principal':<11} {'Interest':<10} {'Total Pay':<11} {'Balance':<12}")
        print("-" * 60)

        # Grace period quarters
        print("GRACE PERIOD (Interest Only):")
        for q in range(1, grace_quarters + 1):
            print(
                f"{q:<8} €{0:<10.2f} €{quarterly_interest_only:<9.2f} €{quarterly_interest_only:<10.2f} €{remaining_balance:<11.2f}")

        print("\nAMORTIZATION PERIOD (Equal Principal + Interest):")
        quarter_num = grace_quarters + 1

        for q in range(amortization_quarters):
            interest_payment = remaining_balance * quarterly_rate
            total_payment = principal_per_quarter + interest_payment

            remaining_balance -= principal_per_quarter
            total_amortization_interest += interest_payment

            # Ensure balance doesn't go negative due to rounding
            if remaining_balance < 0.01:
                remaining_balance = 0

            print(
                f"{quarter_num:<8} €{principal_per_quarter:<10.2f} €{interest_payment:<9.2f} €{total_payment:<10.2f} €{remaining_balance:<11.2f}")
            quarter_num += 1

        # Total calculations
        total_interest = total_grace_interest + total_amortization_interest
        total_principal_payments = grace_quarters * quarterly_interest_only + amortization_quarters * principal_per_quarter
        total_interest_payments = total_grace_interest + total_amortization_interest
        total_paid = principal + total_interest

        # Effective annual rate
        years = total_months / 12
        effective_annual_rate = (total_interest / principal) / years * 100

        print(f"\n=== FINAL SUMMARY ===")
        print(f"Original principal: €{principal:,.2f}")
        print(f"Grace period interest: €{total_grace_interest:,.2f}")
        print(f"Amortization interest: €{total_amortization_interest:,.2f}")
        print(f"TOTAL INTEREST PAID: €{total_interest:,.2f}")
        print(f"Total amount paid: €{total_paid:,.2f}")
        print(f"Nominal annual rate: {annual_rate}%")
        print(f"REAL effective annual rate: {effective_annual_rate:.2f}%")

        # Verification
        print(f"\n=== VERIFICATION ===")
        print(f"Grace period: {grace_quarters} × €{quarterly_interest_only:.2f} = €{total_grace_interest:.2f}")
        print(f"Principal payments: {amortization_quarters} × €{principal_per_quarter:.2f} = €{principal:.2f}")
        print(f"Amortization interest: €{total_amortization_interest:.2f}")
        print(f"Grand total interest: €{total_interest:.2f}")

    except ValueError:
        print("Error: Please enter valid numbers only.")
    except Exception as e:
        print(f"An error occurred: {e}")


def calculate_specific_quarters():
    """
    Show detailed calculation for specific quarters
    """
    print("\n=== DETAILED QUARTER CALCULATION ===")

    try:
        principal = float(input("Enter loan amount (€): "))
        annual_rate = float(input("Enter annual rate (%): "))
        grace_quarters = int(input("Enter grace quarters: "))
        amort_quarters = int(input("Enter amortization quarters: "))

        quarterly_rate = annual_rate / 100 / 4
        principal_per_quarter = principal / amort_quarters

        print(f"\nQuarterly rate: {quarterly_rate * 100:.4f}%")
        print(f"Principal per quarter: €{principal_per_quarter:.2f}")

        balance = principal

        # Show first few amortization quarters in detail
        print(f"\nDetailed calculation for first few amortization quarters:")
        for q in range(1, min(6, amort_quarters + 1)):
            interest = balance * quarterly_rate
            total_payment = principal_per_quarter + interest
            balance -= principal_per_quarter

            print(f"\nQuarter {grace_quarters + q}:")
            print(f"  Balance at start: €{balance + principal_per_quarter:.2f}")
            print(f"  Interest ({quarterly_rate * 100:.4f}%): €{interest:.2f}")
            print(f"  Principal payment: €{principal_per_quarter:.2f}")
            print(f"  Total payment: €{total_payment:.2f}")
            print(f"  Balance at end: €{balance:.2f}")

    except:
        print("Invalid input for detailed calculation.")


def reverse_engineer_rate():
    """
    Given total interest, find what rate produces that result
    """
    print("\n=== REVERSE ENGINEER RATE ===")

    try:
        principal = float(input("Enter loan amount (€): "))
        total_months = int(input("Enter total months: "))
        grace_months = int(input("Enter grace months: "))
        target_total_interest = float(input("Enter actual total interest paid (€): "))

        grace_quarters = grace_months // 3
        amort_quarters = (total_months - grace_months) // 3
        principal_per_quarter = principal / amort_quarters

        # Binary search for rate
        low_rate = 0.0
        high_rate = 50.0
        tolerance = 0.01

        for _ in range(100):
            test_rate = (low_rate + high_rate) / 2
            quarterly_rate = test_rate / 100 / 4

            # Grace interest
            grace_interest = principal * quarterly_rate * grace_quarters

            # Amortization interest
            balance = principal
            amort_interest = 0
            for q in range(amort_quarters):
                interest = balance * quarterly_rate
                amort_interest += interest
                balance -= principal_per_quarter

            total_calculated_interest = grace_interest + amort_interest

            if abs(total_calculated_interest - target_total_interest) < tolerance:
                years = total_months / 12
                effective_rate = (target_total_interest / principal) / years * 100

                print(f"\nTo achieve €{target_total_interest:.2f} total interest:")
                print(f"Nominal annual rate: {test_rate:.2f}%")
                print(f"Effective annual rate: {effective_rate:.2f}%")
                print(f"Grace interest: €{grace_interest:.2f}")
                print(f"Amortization interest: €{amort_interest:.2f}")
                break
            elif total_calculated_interest < target_total_interest:
                low_rate = test_rate
            else:
                high_rate = test_rate
        else:
            print("Could not find exact rate")

    except:
        print("Invalid input")


if __name__ == "__main__":
    calculate_loan_with_grace_and_equal_principal()

    detail = input("\nShow detailed quarter calculations? (y/n): ").lower()
    if detail in ['y', 'yes']:
        calculate_specific_quarters()

    reverse = input("\nReverse-engineer the rate from total interest? (y/n): ").lower()
    if reverse in ['y', 'yes']:
        reverse_engineer_rate()
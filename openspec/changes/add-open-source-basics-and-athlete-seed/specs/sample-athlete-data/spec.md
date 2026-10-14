# Spec Delta

## Purpose

Give development and demo workflows a reusable athlete dataset that is explicitly fictional, geographically representative of the Philippines, and safe to use without a database or live services.

## ADDED Requirements

### Requirement: Seed data contains exactly 30 fictional profiles
The project SHALL provide a repeatable seed workflow that produces exactly 30 structurally valid, fully fictional athlete profiles and does not rely on live athlete records or personal data.

#### Scenario: Generate the sample dataset
- **WHEN** a contributor runs the documented seed workflow
- **THEN** it writes a JSON dataset containing exactly 30 athlete profiles in the documented project data format

#### Scenario: Run the seed workflow repeatedly
- **WHEN** a contributor runs the seed workflow more than once with the same project version
- **THEN** it produces the same profile records and does not append duplicate profiles

### Requirement: Profiles represent every Philippine administrative region
The sample dataset SHALL include at least one profile from each of the 17 Philippine administrative regions and identify each profile's region and province or locality.

#### Scenario: Inspect regional coverage
- **WHEN** a contributor groups the generated profiles by region
- **THEN** all 17 regions are represented and every profile has a non-empty regional location

### Requirement: Athlete examples do not identify real people
Seed records and athlete identities shown by demo fixtures SHALL be fictional, use no real athlete's name or biography, and contain no real contact, proof, or financial account information.

#### Scenario: Review seed and demo athlete identities
- **WHEN** the sample dataset and athlete-facing demo fixtures are reviewed
- **THEN** their athlete identities and profile details are fictional and do not present real athletes as sample users

### Requirement: Sample data avoids unnecessary minor data
Generated athlete profiles SHALL use adult ages and shall not include sensitive personal information.

#### Scenario: Review generated profile attributes
- **WHEN** generated profiles are inspected
- **THEN** each profile's age is at least 18 and no profile contains a home address, phone number, credential, or real identity document

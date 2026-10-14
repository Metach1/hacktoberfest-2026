# Spec Delta

## Purpose

Make the Startletes repository straightforward to understand, set up, and contribute to while clearly communicating its license, community expectations, and environment configuration.

## ADDED Requirements

### Requirement: Repository licensing is explicit
The repository SHALL include a root-level MIT license that identifies the project copyright holder and grants permissions using the standard MIT terms.

#### Scenario: Contributor reviews the license
- **WHEN** a contributor opens the repository
- **THEN** a root-level `LICENSE` file identifies the MIT license and its copyright holder

### Requirement: Project setup and purpose are documented
The README SHALL explain Startletes' purpose, major user-facing capabilities, current technology, local setup and development commands, contribution entry point, and hard constraints on fake data and mock funding.

#### Scenario: New contributor prepares a local checkout
- **WHEN** a contributor follows the README from a fresh checkout
- **THEN** they can identify the prerequisites, install dependencies, start the development server, and find the contribution guidance

### Requirement: Contribution and conduct expectations are available
The repository SHALL provide a contribution guide with practical validation and pull-request expectations and a code of conduct that states expected behavior, prohibited behavior, and a private way to report concerns to maintainers.

#### Scenario: Contributor needs to report misconduct
- **WHEN** a contributor experiences or observes conduct that violates the code of conduct
- **THEN** the code of conduct describes a private reporting channel and how maintainers handle reports

### Requirement: Environment examples are safe to commit
The repository SHALL provide a tracked `.env.example` containing only documented placeholder or non-secret values, while local `.env` files remain ignored by Git.

#### Scenario: Contributor configures local environment
- **WHEN** a contributor copies `.env.example` to a local environment file
- **THEN** the template contains no credentials or live secrets and Git continues to ignore the local copy

#### Scenario: Repository tracks the environment template
- **WHEN** Git evaluates the root `.env.example`
- **THEN** the file is not ignored even though other `.env*` files remain ignored

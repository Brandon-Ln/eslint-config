# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-07-15

### Added

- Apply cyclomatic complexity and per-file line limits to all managed JavaScript and TypeScript source files, including projects without TypeScript.
- Extend React Hooks linting to all JavaScript and TypeScript file variants so custom Hooks without JSX are checked.

### Fixed

- Scope Vue recommended rules to Vue files, preventing Vue rules from being applied to plain JavaScript files.

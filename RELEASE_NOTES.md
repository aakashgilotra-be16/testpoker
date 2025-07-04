# Release Notes

## v1.0.0 (July 5, 2025)

This marks the first official release of the Planning Poker application.

### New Features

- **Improved Vote Visibility and Connection Reliability**:
  - Enhanced vote matching logic to correctly identify users by both userId and displayName
  - Added connection status indicators to help users identify connection issues
  - Improved reconnection logic for more reliable socket connections
  - Fixed issues where users' votes weren't properly visible to others

- **Default Voting Deck Updates**:
  - Set "Powers of Two" as the default voting deck
  - Added "24" as a new estimate value to the Powers of Two deck
  - Updated deck type dropdown to show "Powers of Two" as the first option

- **UI Enhancements**:
  - Added a custom Playing Card favicon/tab icon
  - Created a favicon generator tool for producing different size favicon assets
  - Improved voting UI with better progress indicators
  - Added optimistic UI updates for smoother user experience

### Technical Improvements

- Enhanced error handling throughout the application
- Added improved logging for debugging
- Restructured components for better maintainability
- Added Toast notifications system for improved user feedback

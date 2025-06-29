# SUPR Event Format Examples

This document shows examples of various spreadsheet formats that the SUPR parsing system can handle.

## Supported Column Header Variations

### Player Names
- `Name`, `Player Name`, `Player`, `Display Name`, `Full Name`
- `First Name`, `Last Name`, `Participant`, `Golfer`

### Scores  
- `Score`, `Total`, `Points`, `Final Score`, `Net`, `Gross`, `Result`

### Positions
- `Position`, `Place`, `Rank`, `Pos`, `Placement`, `Finish`

## Example Format 1: Standard Headers
```csv
Name,Score,Position
John Smith,75,1
Jane Doe,78,2
Bob Wilson,82,3
```

## Example Format 2: Alternative Headers
```csv
Player,Total,Place
Alice Johnson,85,1
Mike Brown,87,2
Sarah Davis,89,3
```

## Example Format 3: Minimal Headers
```csv
Participant,Points,Rank
Tom Anderson,42,1
Lisa White,38,2
Chris Taylor,35,3
```

## Example Format 4: No Headers (Auto-Detection)
```csv
Player Data
Eric Moore,72,1
Sam Jones,74,2
Kate Miller,76,3
```

## Example Format 5: Mixed Order Columns
```csv
Place,Player Name,Final Score
1,David Lee,69
2,Amy Clark,71
3,Ryan Hall,73
```

## Features

### Auto-Detection
- If column headers don't match patterns, the system tries to detect:
  - First non-numeric value longer than 1 character = Player Name
  - Numeric values = Score or Position
  - Position defaults to row number if not found

### Data Cleaning
- Removes common prefixes like "Player", "Participant", "Golfer"
- Removes score-related suffixes like "Score", "Points", "Total"
- Trims whitespace

### Defaults
- Missing handicap = 0 (typical for SUPR events)
- Missing club = "Unknown" (will be mapped via player database)
- Missing position = row number

### Integration
- Works with new player detection system
- Automatically prompts admin for display names of unknown players
- Handles both CSV and Excel (.xlsx) files
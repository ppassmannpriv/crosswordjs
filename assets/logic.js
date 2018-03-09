// Each cell on the crossword grid is null or one of these
function Cell(letter){
    //string Character of word
    this.char = letter;
    //CellNodes
    this.across = null;
    this.down = null;
}

// You can tell if the Node is the start of a word (which is needed if you want to number the cells)
// and what word and clue it corresponds to (using the index)
function CellNode(is_start_of_word, index){
    this.is_start_of_word = is_start_of_word;
    this.index = index; // use to map this node to its word or clue
}

function Word(word, index){
    this.word = word; // the actual word
    this.index = index; // use to map this node to its word or clue
}

function Crossword(words_in, clues_in) {
    // Init values for a grid as a starting point to place the first word.
    // Grid will be multidimensional array being grid[ROW][COL]
    var GRID_ROWS = 50;
    var GRID_COLS = 50;

    // Positional index for all found characters and where they are in the grid
    var char_index = {};

    // these words cannot be placed on the grid
    var skippedWords;

    // returns grid with best possible ratio
    this.getSquareGrid = function(max_tries){
        var best_grid = null;
        var best_ratio = 0;
        for(var i = 0; i < max_tries; i++){
            var a_grid = this.getGrid(1);
            if(a_grid == null) continue;
            var ratio = Math.min(a_grid.length, a_grid[0].length) * 1.0 / Math.max(a_grid.length, a_grid[0].length);
            if(ratio > best_ratio){
                best_grid = a_grid;
                best_ratio = ratio;
            }

            if(best_ratio == 1) break;
        }
        return best_grid;
    }

    // returns an abitrary grid, or null if it can't build one
    this.getGrid = function(max_tries){
        for(var tries = 0; tries < max_tries; tries++){
            clear(); // always start with a fresh grid and char_index
            // place the first word in the middle of the grid
            var start_dir = randomDirection();
            var r = Math.floor(grid.length / 2);
            var c = Math.floor(grid[0].length / 2);
            var word_element = word_elements[0];
            if(start_dir == "across"){
                c -= Math.floor(word_element.word.length/2);
            } else {
                r -= Math.floor(word_element.word.length/2);
            }

            if(canPutWordIntoGrid(word_element.word, r, c, start_dir) !== false){
                putWordIntoGrid(word_element.word, word_element.index, r, c, start_dir);
            } else {
                skippedWords = [word_element];
                return null;
            }

            // start with a group containing all the words (except the first)
            // as we go, we try to place each word in the group onto the grid
            // if the word can't go on the grid, we add that word to the next group
            var groups = [];
            groups.push(word_elements.slice(1));
            for(var g = 0; g < groups.length; g++){
                word_has_been_added_to_grid = false;
                // try to add all the words in this group to the grid
                for(var i = 0; i < groups[g].length; i++){
                    var word_element = groups[g][i];
                    var best_position = findPositionForWord(word_element.word);
                    if(!best_position){
                        // make the new group (if needed)
                        if(groups.length - 1 == g) groups.push([]);
                        // place the word in the next group
                        groups[g+1].push(word_element);
                    } else {
                        var r = best_position["row"], c = best_position["col"], dir = best_position['direction'];
                        putWordIntoGrid(word_element.word, word_element.index, r, c, dir);
                        word_has_been_added_to_grid = true;
                    }
                }
                // if we have no words on the grid yet, our grid is useless
                if(!word_has_been_added_to_grid) break;
            }
            // simplify the grid
            if(word_has_been_added_to_grid) return minimizeGrid();
        }

        skippedWords = groups[groups.length - 1];
        return null;
    }

    // retuns skipped words
    this.getBadWords = function(){
        return skippedWords;
    }

    // get two arrays ("across" and "down") that contain objects describing the
    // topological position of the word (e.g. 1 is the first word starting from
    // the top left, going to the bottom right), the index of the word (in the
    // original input list), the clue, and the word itself
    this.getLegend = function(grid){
        var groups = {"across" : [], "down" : []};
        var position = 1;
        for(var r = 0; r < grid.length; r++){
            for(var c = 0; c < grid[r].length; c++){
                var cell = grid[r][c];
                var increment_position = false;
                // check across and down
                for(var k in groups){
                    // does a word start here? (make sure the cell isn't null, first)
                    if(cell && cell[k] && cell[k]['is_start_of_word']){
                        var index = cell[k]['index'];
                        groups[k].push({"position" : position, "index" : index, "clue" : clues_in[index], "word" : words_in[index]});
                        increment_position = true;
                    }
                }

                if(increment_position) position++;
            }
        }
        return groups;
    }

    // make grid smaller
    var minimizeGrid = function(){
        //gridsize
        var r_min = GRID_ROWS-1, r_max = 0, c_min = GRID_COLS-1, c_max = 0;
        for(var r = 0; r < GRID_ROWS; r++){
            for(var c = 0; c < GRID_COLS; c++){
                var cell = grid[r][c];
                if(cell != null){
                    if(r < r_min) r_min = r;
                    if(r > r_max) r_max = r;
                    if(c < c_min) c_min = c;
                    if(c > c_max) c_max = c;
                }
            }
        }

        //initgrid with found gridsize
        var rows = r_max - r_min + 1;
        var cols = c_max - c_min + 1;
        var new_grid = new Array(rows);
        for(var r = 0; r < rows; r++){
            for(var c = 0; c < cols; c++){
                new_grid[r] = new Array(cols);
            }
        }

        //move old into new grid
        for(var r = r_min, r2 = 0; r2 < rows; r++, r2++){
            for(var c = c_min, c2 = 0; c2 < cols; c++, c2++){
                new_grid[r2][c2] = grid[r][c];
            }
        }

        return new_grid;
    }

    // helper for putWordIntoGrid();
    var addCell = function(word, index_of_word_in_input_list, index_of_char, r, c, direction){
        var char = word.charAt(index_of_char);
        if(grid[r][c] == null){
            grid[r][c] = new Cell(char);

            // init the char_index for that character if needed
            if(!char_index[char]) char_index[char] = [];

            // add to index
            char_index[char].push({"row" : r, "col" : c});
        }

        var is_start_of_word = index_of_char == 0;
        grid[r][c][direction] = new CellNode(is_start_of_word, index_of_word_in_input_list);

    }

    // place the word at the row and col indicated (the first char goes there)
    // the next chars go to the right (across) or below (down), depending on the direction
    var putWordIntoGrid = function(word, index_of_word_in_input_list, row, col, direction){
        if(direction == "across"){
            for(var c = col, i = 0; c < col + word.length; c++, i++){
                addCell(word, index_of_word_in_input_list, i, row, c, direction);
            }
        } else if(direction == "down"){
            for(var r = row, i = 0; r < row + word.length; r++, i++){
                addCell(word, index_of_word_in_input_list, i, r, col, direction);
            }
        } else {
            throw "Invalid Direction";
        }
    }

    // you can only place a char where the space is blank, or when the same
    // character exists there already
    // returns false, if you can't place the char
    // 0 if you can place the char, but there is no intersection
    // 1 if you can place the char, and there is an intersection
    var canPlaceCharAt = function(char, row, col){
        // no intersection
        if(grid[row][col] == null) return 0;
        // intersection!
        if(grid[row][col]['char'] == char) return 1;

        return false;
    }

    // determines if you can place a word at the row, column in the direction
    var canPutWordIntoGrid = function(word, row, col, direction){
        // out of bounds
        if(row < 0 || row >= grid.length || col < 0 || col >= grid[row].length) return false;

        if(direction == "across"){
            // out of bounds (word too long)
            if(col + word.length > grid[row].length) return false;
            // can't have a word directly to the left
            if(col - 1 >= 0 && grid[row][col - 1] != null) return false;
            // can't have word directly to the right
            if(col + word.length < grid[row].length && grid[row][col+word.length] != null) return false;

            // check the row above to make sure there isn't another word
            // running parallel. It is ok if there is a character above, only if
            // the character below it intersects with the current word
            for(var r = row - 1, c = col, i = 0; r >= 0 && c < col + word.length; c++, i++){
                var is_empty = grid[r][c] == null;
                var is_intersection = grid[row][c] != null && grid[row][c]['char'] == word.charAt(i);
                var can_place_here = is_empty || is_intersection;
                if(!can_place_here) return false;
            }

            // same deal as above, we just search in the row below the word
            for(var r = row + 1, c = col, i = 0; r < grid.length && c < col + word.length; c++, i++){
                var is_empty = grid[r][c] == null;
                var is_intersection = grid[row][c] != null && grid[row][c]['char'] == word.charAt(i);
                var can_place_here = is_empty || is_intersection;
                if(!can_place_here) return false;
            }

            // check to make sure we aren't overlapping a char (that doesn't match)
            // and get the count of intersections
            var intersections = 0;
            for(var c = col, i = 0; c < col + word.length; c++, i++){
                var result = canPlaceCharAt(word.charAt(i), row, c);
                if(result === false) return false;
                intersections += result;
            }
        } else if(direction == "down"){
            // out of bounds
            if(row + word.length > grid.length) return false;
            // can't have a word directly above
            if(row - 1 >= 0 && grid[row - 1][col] != null) return false;
            // can't have a word directly below
            if(row + word.length < grid.length && grid[row+word.length][col] != null) return false;

            // check the column to the left to make sure there isn't another
            // word running parallel. It is ok if there is a character to the
            // left, only if the character to the right intersects with the
            // current word
            for(var c = col - 1, r = row, i = 0; c >= 0 && r < row + word.length; r++, i++){
                var is_empty = grid[r][c] == null;
                var is_intersection = grid[r][col] != null && grid[r][col]['char'] == word.charAt(i);
                var can_place_here = is_empty || is_intersection;
                if(!can_place_here) return false;
            }

            // same deal, but look at the column to the right
            for(var c = col + 1, r = row, i = 0; r < row + word.length && c < grid[r].length; r++, i++){
                var is_empty = grid[r][c] == null;
                var is_intersection = grid[r][col] != null && grid[r][col]['char'] == word.charAt(i);
                var can_place_here = is_empty || is_intersection;
                if(!can_place_here) return false;
            }

            // check to make sure we aren't overlapping a char (that doesn't match)
            // and get the count of intersections
            var intersections = 0;
            for(var r = row, i = 0; r < row + word.length; r++, i++){
                var result = canPlaceCharAt(word.charAt(i, 1), r, col);
                if(result === false) return false;
                intersections += result;
            }
        } else {
            throw "Invalid Direction";
        }
        return intersections;
    }

    var randomDirection = function(){
        return Math.floor(Math.random()*2) ? "across" : "down";
    }

    var findPositionForWord = function(word){
        //check char_index for placement
        var bests = [];
        for(var i = 0; i < word.length; i++){
            var possible_locations_on_grid = char_index[word.charAt(i)];
            if(!possible_locations_on_grid) continue;
            for(var j = 0; j < possible_locations_on_grid.length; j++){
                var point = possible_locations_on_grid[j];
                var r = point['row'];
                var c = point['col'];
                // the c - i, and r - i here compensate for the offset of character in the word
                var intersections_across = canPutWordIntoGrid(word, r, c - i, "across");
                var intersections_down = canPutWordIntoGrid(word, r - i, c, "down");

                if(intersections_across !== false)
                    bests.push({"intersections" : intersections_across, "row" : r, "col" : c - i, "direction" : "across"});
                if(intersections_down !== false)
                    bests.push({"intersections" : intersections_down, "row" : r - i, "col" : c, "direction" : "down"});
            }
        }

        if(bests.length == 0) return false;

        //random from bests list
        var best = bests[Math.floor(Math.random()*bests.length)];

        return best;

    }

    var clear = function(){
        for(var r = 0; r < grid.length; r++){
            for(var c = 0; c < grid[r].length; c++){
                grid[r][c] = null;
            }
        }
        char_index = {};
    }

    // constructor
    if(words_in.length < 2) throw "Puzzle consists of at least 2 words";
    if(words_in.length != clues_in.length) throw "Clues are not the same number as words";

    // build the grid;
    var grid = new Array(GRID_ROWS);
    for(var i = 0; i < GRID_ROWS; i++){
        grid[i] = new Array(GRID_COLS);
    }

    // build the element list (need to keep track of indexes in the original input arrays)
    var word_elements = [];
    for(var i = 0; i < words_in.length; i++){
        word_elements.push(new Word(words_in[i], i));
    }

    // I got this sorting idea from http://stackoverflow.com/questions/943113/algorithm-to-generate-a-crossword/1021800#1021800
    // seems to work well
    word_elements.sort(function(a, b){ return b.word.length - a.word.length; });
}

var CrosswordUtils = {
    PATH_TO_PNGS_OF_NUMBERS : "numbers/",

    toHtml : function(grid, show_answers){
        if(grid == null) return;
        var html = [];
        html.push("<table class='crossword'>");
        var label = 1;
        for(var r = 0; r < grid.length; r++){
            html.push("<tr>");
            for(var c = 0; c < grid[r].length; c++){
                var cell = grid[r][c];
                var is_start_of_word = false;
                if(cell == null) {
                    var char = "&nbsp;";
                    var css_class = "no-border";
                } else {
                    var char = cell['char'];
                    var css_class = "";
                    var is_start_of_word = (cell['across'] && cell['across']['is_start_of_word']) || (cell['down'] && cell['down']['is_start_of_word']);
                }

                if(is_start_of_word) {
                    html.push("<td class='" + css_class + "' title='" + r + ", " + c + "' data-label='" + label + "'>");
                    label++;
                } else {
                    html.push("<td class='" + css_class + "' title='" + r + ", " + c + "'>");
                }

                if(show_answers) {
                    html.push(char);
                } else {
                    html.push("&nbsp;");
                }
            }
            html.push("</tr>");
        }
        html.push("</table>");
        return html.join("\n");
    }
}


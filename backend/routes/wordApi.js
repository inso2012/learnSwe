const express = require('express');
const router = express.Router();
const { createWord, getWords, updateWord, deleteWord } = require('../models/Word');

/**
 * @route   POST /api/words
 * @desc    Create a new word
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        const word = await createWord(req.body);
        res.status(201).json({ success: true, data: word });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/words
 * @desc    Get all words
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const words = await getWords();
        res.status(200).json({ success: true, data: words });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   PUT /api/words/:id
 * @desc    Update a word by ID
 * @access  Public
 */
router.put('/:id', async (req, res) => {
    try {
        const word = await updateWord(req.params.id, req.body);
        if (!word) return res.status(404).json({ success: false, error: 'Word not found' });
        res.status(200).json({ success: true, data: word });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

 /* @route   DELETE /api/words/:id
 * @desc    Delete a word by ID
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
    try {
        await deleteWord(req.params.id);
        res.status(204).end();
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
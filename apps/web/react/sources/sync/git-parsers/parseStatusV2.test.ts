import { describe, expect, it } from 'vite-plus/test';
import { parseStatusSummaryV2 } from './parseStatusV2';

const ZERO_HASH = '0000000';
const FILE_MODE = '100644';

describe('parseStatusSummaryV2', () => {
    it('parses porcelain v2 rename records with the current path before the original path', () => {
        const summary = parseStatusSummaryV2(
            `2 R. N... ${FILE_MODE} ${FILE_MODE} ${FILE_MODE} ${ZERO_HASH} ${ZERO_HASH} R100 new.txt\told.txt`
        );

        expect(summary.files).toHaveLength(1);
        expect(summary.files[0]).toMatchObject({
            index: 'R',
            working_dir: '.',
            path: 'new.txt',
            from: 'old.txt',
            renameScore: 100
        });
        expect(summary.staged).toEqual(['new.txt']);
        expect(summary.renamed).toEqual(['new.txt']);
    });

    it('parses porcelain v2 copy records with the current path before the original path', () => {
        const summary = parseStatusSummaryV2(
            `2 C. N... ${FILE_MODE} ${FILE_MODE} ${FILE_MODE} ${ZERO_HASH} ${ZERO_HASH} C75 copied.txt\tsource.txt`
        );

        expect(summary.files).toHaveLength(1);
        expect(summary.files[0]).toMatchObject({
            index: 'C',
            working_dir: '.',
            path: 'copied.txt',
            from: 'source.txt',
            renameScore: 75
        });
        expect(summary.staged).toEqual(['copied.txt']);
        expect(summary.renamed).toEqual(['copied.txt']);
    });
});

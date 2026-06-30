import * as XLSX from 'xlsx';

/**
 * Reconstruct the WEEKLY PLAN Excel from plan data (with edits applied).
 * Format mirrors the original: weeks as columns, categories as rows.
 */

const ROW_LABELS = [
  { key: null,                        label: 'QUARTER',                    section: 'root',    field: 'quarter'                },
  { key: null,                        label: 'MONTH',                      section: 'root',    field: 'month'                  },
  { key: null,                        label: 'WEEK',                       section: 'root',    field: 'week'                   },
  { key: null,                        label: 'WEEKDAYS',                   section: 'root',    field: 'weekdays'               },
  { key: null,                        label: '',                           section: null                                        },
  { key: 'commercial_push',           label: 'Commercial push',            section: 'transposed', rowDef: 4  },
  { key: 'brand_push',                label: 'Brand Push',                 section: 'transposed', rowDef: 5  },
  { key: null,                        label: '',                           section: null                                        },
  { key: 'last_year',                 label: 'LAST YEAR 2025',             section: 'context', field: 'lastYear'               },
  { key: 'week_topic',                label: 'WEEK TOPIC 2026',            section: 'context', field: 'weekTopic'              },
  { key: null,                        label: '',                           section: null                                        },
  { key: 'main_campaign',             label: '1 MAIN CAMPAIGN',            section: 'brand',   field: 'mainCampaign'           },
  { key: 'commercial2',               label: '2 COMMERCIAL',               section: 'brand',   field: 'commercial'             },
  { key: 'opportunity',               label: '3 OPPORTUNITY',              section: 'brand',   field: 'opportunity'            },
  { key: 'corporate',                 label: '4 CORPORATE',                section: 'brand',   field: 'corporate'              },
  { key: 'regional',                  label: '5 REGIONAL TOPIC',           section: 'brand',   field: 'regional'               },
  { key: null,                        label: '',                           section: null                                        },
  { key: 'tue_ww',                    label: 'TUESDAY WW',                 section: 'marketing.tuesday', field: 'ww'           },
  { key: 'tue_note',                  label: 'NOTE',                       section: 'marketing.tuesday', field: 'note'         },
  { key: 'tue_sku',                   label: 'SKU CODE',                   section: 'marketing.tuesday', field: 'skuCode'      },
  { key: 'tue_image',                 label: 'IMAGE',                      section: 'marketing.tuesday', field: 'image'        },
  { key: null,                        label: '',                           section: null                                        },
  { key: 'wed_topic',                 label: 'WEDNESDAY - BEST PERFORMER', section: 'marketing.wednesday', field: 'topic'      },
  { key: 'wed_eu',                    label: 'EMEA',                       section: 'marketing.wednesday', field: 'eu'         },
  { key: 'wed_us',                    label: 'US',                         section: 'marketing.wednesday', field: 'us'         },
  { key: 'wed_kr',                    label: 'KR',                         section: 'marketing.wednesday', field: 'kr'         },
  { key: null,                        label: '',                           section: null                                        },
  { key: 'thu_topic',                 label: 'THURSDAY',                   section: 'marketing.thursday',  field: 'topic'      },
  { key: 'thu_eu',                    label: 'EMEA',                       section: 'marketing.thursday',  field: 'eu'         },
  { key: 'thu_us',                    label: 'US',                         section: 'marketing.thursday',  field: 'us'         },
  { key: 'thu_kr',                    label: 'KR',                         section: 'marketing.thursday',  field: 'kr'         },
  { key: null,                        label: '',                           section: null                                        },
  { key: 'fri_topic',                 label: 'FRIDAY - WORST SELLER',      section: 'marketing.friday',    field: 'topic'      },
  { key: 'fri_eu',                    label: 'EMEA',                       section: 'marketing.friday',    field: 'eu'         },
  { key: 'fri_us',                    label: 'US',                         section: 'marketing.friday',    field: 'us'         },
  { key: 'fri_kr',                    label: 'KR',                         section: 'marketing.friday',    field: 'kr'         },
  { key: 'fri_app',                   label: 'APP EXCLUSIVE',              section: 'marketing.friday',    field: 'appTopic'   },
  { key: 'fri_product',               label: 'PRODUCT CODE',               section: 'marketing.friday',    field: 'productCode'},
  { key: null,                        label: '',                           section: null                                        },
  { key: 'sat_topic',                 label: 'SATURDAY TOPIC',             section: 'marketing.saturday',  field: 'topic'      },
  { key: 'sat_sku',                   label: 'SATURDAY SKU',               section: 'marketing.saturday',  field: 'skuCode'    },
  { key: 'sat_note',                  label: 'SATURDAY NOTE',              section: 'marketing.saturday',  field: 'note'       },
];

function getVal(week, row) {
  if (row.section === null) return '';
  if (row.section === 'root') return week[row.field] ?? '';

  const parts = row.section.split('.');
  let obj = week;
  for (const p of parts) obj = obj?.[p];
  return obj?.[row.field] ?? '';
}

export function exportToExcel(plan, yearArg) {
  const { weeks, filename } = plan;
  const year = yearArg ?? plan.year;

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: WEEKLY PLAN (full transposed) ──────────────
  const numCols = weeks.length + 2; // label col + week cols
  const aoa = ROW_LABELS.map(row => {
    const labelCell = row.label;
    const dataCells = weeks.map(w => getVal(w, row));
    return [labelCell, ...dataCells];
  });

  // Insert week number row header
  const weekNums = ['WEEK', ...weeks.map(w => w.week)];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws['!cols'] = [{ wch: 28 }, ...weeks.map(() => ({ wch: 30 }))];

  // Style header row (row 0 = QUARTER, row 2 = WEEK) — basic bold via cell format
  // SheetJS CE doesn't support rich cell styles, but we can set row heights
  ws['!rows'] = ROW_LABELS.map((r, i) => ({
    hpt: r.label === '' ? 8 : (r.section === null ? 8 : 18),
  }));

  XLSX.utils.book_append_sheet(wb, ws, `WEEKLY PLAN ${year}`);

  // ── Sheet 2: BRAND CALENDAR ─────────────────────────────
  const brandRows = [
    ['SETTIMANA', 'WEEKDAYS', 'MONTH', 'MAIN CAMPAIGN', 'COMMERCIAL', 'OPPORTUNITY', 'CORPORATE', 'REGIONAL TOPIC'],
    ...weeks.map(w => [
      `W${w.week}`,
      w.weekdays || '',
      w.month || '',
      w.brand.mainCampaign || '',
      w.brand.commercial   || '',
      w.brand.opportunity  || '',
      w.brand.corporate    || '',
      w.brand.regional     || '',
    ]),
  ];
  const wsBrand = XLSX.utils.aoa_to_sheet(brandRows);
  wsBrand['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsBrand, 'Brand Calendar');

  // ── Sheet 3: MARKETING ACTIVATIONS ─────────────────────
  const mktRows = [
    ['W', 'WEEKDAYS', 'TUE WW', 'TUE NOTE', 'TUE SKU',
     'WED TOPIC', 'WED EU', 'WED US', 'WED KR',
     'THU TOPIC', 'THU EU', 'THU US', 'THU KR',
     'FRI TOPIC', 'FRI EU', 'FRI US', 'FRI KR',
     'APP EXCLUSIVE', 'PRODUCT CODE',
     'SAT TOPIC', 'SAT SKU', 'SAT NOTE', 'STRATEGY LINKS'],
    ...weeks.map(w => {
      const t = w.marketing.tuesday;
      const wed = w.marketing.wednesday;
      const thu = w.marketing.thursday;
      const fri = w.marketing.friday;
      const sat = w.marketing.saturday;
      return [
        `W${w.week}`, w.weekdays || '',
        t.ww, t.note, t.skuCode,
        wed.topic, wed.eu, wed.us, wed.kr,
        thu.topic, thu.eu, thu.us, thu.kr,
        fri.topic, fri.eu, fri.us, fri.kr,
        fri.appTopic, fri.productCode,
        sat.topic, sat.skuCode, sat.note,
        (w.strategyLinks || []).map(l => `${l.label || ''}: ${l.url || ''}`).join('\n'),
      ];
    }),
  ];
  const wsMkt = XLSX.utils.aoa_to_sheet(mktRows);
  wsMkt['!cols'] = mktRows[0].map(() => ({ wch: 30 }));
  XLSX.utils.book_append_sheet(wb, wsMkt, 'Marketing Activations');

  // Download
  const exportName = `Piano_GoldenGoose_${year}.xlsx`;
  XLSX.writeFile(wb, exportName);
  return exportName;
}

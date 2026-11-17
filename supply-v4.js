
'use strict';

// BARAKAH V4 — Supply Orders & Purchase Batches
// Works with existing app.js and Supabase tables.

titleMap.supply = 'أصناف التوريد والأرباح';
tables.push('supply_order_items', 'supply_purchase_batches');

const supplyNav = document.createElement('button');
supplyNav.dataset.page = 'supply';
supplyNav.innerHTML = '▤ <span>أصناف التوريد والأرباح</span>';

const projectsNav = document.querySelector(
  '#nav button[data-page="projects"]'
);

if (projectsNav) projectsNav.after(supplyNav);
else document.querySelector('#nav').append(supplyNav);

supplyNav.onclick = () => {
  if (state.workspace?.kind !== 'work') {
    toast('هذه الصفحة مخصصة لمساحة الشغل.');
    return;
  }
  goPage('supply');
};

function supplyProfitPage() {
  if (state.workspace?.kind !== 'work') {
    return '<div class="panel empty">اختاري مساحة الشغل.</div>';
  }

  const items = list('supply_order_items');
  const batches = list('supply_purchase_batches');
  const projects = list('projects');
  const parties = list('parties');

  const rows = items.map(item => {
    const related = batches.filter(
      batch => batch.order_item_id === item.id
    );

    const purchased = related.reduce(
      (total, batch) => total + Number(batch.quantity), 0
    );

    const totalCost = related.reduce(
      (total, batch) =>
        total +
        Number(batch.quantity) *
        Number(batch.purchase_unit_price), 0
    );

    const average = purchased > 0
      ? totalCost / purchased
      : null;

    const delivered = Number(item.delivered_quantity);
    const revenue = delivered * Number(item.selling_unit_price);

    const complete = purchased >= delivered && purchased > 0;

    const profit = complete
      ? delivered * (Number(item.selling_unit_price) - average)
      : null;

    const batchDetails = related.map(batch => `
      <div style="padding:6px 0;font-size:13px">
        ${escapeHTML(batch.purchased_on)} —
        ${escapeHTML(nameOf(parties, batch.supplier_id))} —
        ${Number(batch.quantity)} ×
        ${money(batch.purchase_unit_price, batch.currency)}
      </div>
    `).join('');

    return `
      <div class="panel" style="margin-bottom:16px">
        <div class="section-header">
          <div>
            <h2>${escapeHTML(item.item_name)}</h2>
            <small>
              ${escapeHTML(nameOf(projects, item.project_id))}
              — ${escapeHTML(item.currency)}
            </small>
          </div>
          <button class="btn primary"
            data-action="supplyBatch"
            data-item="${item.id}">
            + دفعة شراء
          </button>
        </div>

        <div class="stats">
          <div class="stat">
            <span class="tag">الكمية الموردة</span>
            <strong>${delivered}</strong>
          </div>
          <div class="stat">
            <span class="tag">تكلفة الوحدة المرجحة</span>
            <strong>
              ${average === null ? 'غير متوفرة' :
                money(average, item.currency)}
            </strong>
          </div>
          <div class="stat">
            <span class="tag">قيمة البيع</span>
            <strong>${money(revenue, item.currency)}</strong>
          </div>
          <div class="stat">
            <span class="tag">الربح الإجمالي التقديري</span>
            <strong>
              ${profit === null ? 'تكلفة غير مكتملة' :
                money(profit, item.currency)}
            </strong>
          </div>
        </div>

        <h3>دفعات الشراء</h3>
        ${batchDetails || '<p>لا توجد دفعات شراء مسجلة.</p>'}

        ${item.is_nonprofit ?
          '<p class="muted">هذا الصنف محدد كبند بدون ربح.</p>' : ''}

        <p class="muted tiny">
          هذا تقدير للربح الإجمالي، ولا يشمل المصاريف
          الإضافية أو حساب التحصيلات النقدية.
        </p>
      </div>
    `;
  }).join('');

  return `
    <div class="section-header">
      <h2>أصناف طلبات التوريد</h2>
      <button class="btn primary" data-action="supplyItem">
        + إضافة صنف
      </button>
    </div>
    <div class="notice">
      لكل صنف سعر بيع مستقل. يمكنك تسجيل عدة دفعات شراء
      بأسعار مختلفة. تسجيل الدفعة هنا لا يسجل صرفًا نقديًا.
    </div>
    ${rows || `
      <div class="panel empty">
        لا توجد أصناف بعد. أنشئي مشروع توريد أولًا،
        ثم اضغطي إضافة صنف.
      </div>
    `}
  `;
}

const previousListPage = listPage;

listPage = function () {
  if (state.page === 'supply') return supplyProfitPage();
  return previousListPage();
};

const previousEditorSchema = editorSchema;

editorSchema = function (action) {
  const ws = workspace();

  if (action === 'supplyItem') {
    return {
      title: 'إضافة صنف توريد',
      fields: [
        field('project_id', 'طلب التوريد', 'select',
          options(list('projects'), 'اختاري المشروع').slice(1)),
        field('item_name', 'اسم الصنف'),
        field('unit', 'الوحدة', 'text', null,
          { default: 'قطعة' }),
        field('planned_quantity', 'الكمية المطلوبة',
          'number', null, { step: '0.001' }),
        field('delivered_quantity', 'الكمية الموردة',
          'number', null, { default: '0', step: '0.001' }),
        field('selling_unit_price', 'سعر بيع الوحدة',
          'number', null, { step: '0.01' })
      ],
      save: async v => {
        const project = list('projects').find(
          x => x.id === v.project_id
        );

        if (!project) throw Error('اختاري مشروعًا صحيحًا');

        const planned = Number(v.planned_quantity);
        const delivered = Number(v.delivered_quantity);

        if (planned <= 0 || delivered > planned) {
          throw Error('راجعي الكمية المطلوبة والموردة');
        }

        return insert('supply_order_items', {
          workspace_id: ws,
          project_id: project.id,
          item_name: v.item_name.trim(),
          unit: v.unit,
          planned_quantity: planned,
          delivered_quantity: delivered,
          selling_unit_price: Number(v.selling_unit_price),
          currency: project.currency,
          created_by: state.session.user.id
        });
      }
    };
  }

  if (action === 'supplyBatch') {
    const itemId = window.barakahSelectedSupplyItem;

    return {
      title: 'تسجيل دفعة شراء',
      fields: [
        field('purchased_on', 'تاريخ الشراء', 'date',
          null, { default: iso() }),
        field('supplier_id', 'المورد', 'select',
          options(list('parties'))),
        field('quantity', 'الكمية المشتراة', 'number',
          null, { step: '0.001' }),
        field('purchase_unit_price', 'سعر شراء الوحدة',
          'number', null, { step: '0.01' }),
        field('receipt_ref', 'رقم الفاتورة', 'text',
          null, { required: false })
      ],
      save: async v => {
        const item = list('supply_order_items').find(
          x => x.id === itemId
        );

        if (!item) throw Error('لم يتم العثور على الصنف');

        if (Number(v.quantity) <= 0) {
          throw Error('الكمية يجب أن تكون أكبر من صفر');
        }

        return insert('supply_purchase_batches', {
          workspace_id: ws,
          order_item_id: item.id,
          supplier_id: v.supplier_id || null,
          purchased_on: v.purchased_on,
          quantity: Number(v.quantity),
          purchase_unit_price: Number(v.purchase_unit_price),
          currency: item.currency,
          receipt_ref: v.receipt_ref || null,
          created_by: state.session.user.id
        });
      }
    };
  }

  return previousEditorSchema(action);
};


const previousBindContent = bindContent;

bindContent = function () {
  previousBindContent();

  document.querySelectorAll('[data-action="supplyBatch"]')
    .forEach(button => {
      button.onclick = () => {
        window.barakahSelectedSupplyItem = button.dataset.item;

        openEditor('supplyBatch');

        // المورد اختياري، ولا يجب منع الحفظ بدونه
        const supplierField =
          document.querySelector(
            '#editor select[name="supplier_id"]'
          );

        if (supplierField) {
          supplierField.required = false;
          supplierField.value = '';
          supplierField.removeAttribute('required');
        }
      };
    });
};


const previousRender = render;

render = function () {
  if (state.workspace?.kind !== 'work' && state.page === 'supply') {
    state.page = 'dashboard';
  }

  supplyNav.hidden = state.workspace?.kind !== 'work';
  previousRender();
};

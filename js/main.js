function readSingleFile(evt) {
    var f = evt.target.files[0];
    if (f) {
      var r = new FileReader();
      var table = '';
      r.onload = function(e) {
          var contents = e.target.result;
          var lines = contents.split("\n"), output = [];
          for (var i=0; i< lines.length; i++){
            if(lines[i] == "\n" || lines[i].trim().length == 0) { continue;}
            else {
              output.push("<tr><td>" + lines[i].split(",").join("</td><td>") + "</td></tr>");
            }
          }
          output = "<table>" + output.join("") + "</table>";
          table = output;
          document.getElementById('parsed_csv_list').innerHTML = table;
     }
      r.readAsText(f);
    } else {
      alert("Failed to load file");
    }
  }
document.getElementById('fileinput').addEventListener('change', readSingleFile);

var formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'VND',
});


function readEscrowDetailData() {
  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent case");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  var str = document.getElementById("escrow_detail_data").value;
  if (!str) {
    alert('Please copy all data from esscrow_detail of order and input above.');
  } else {
    var lines = str.split(/\n/);
    var newStr = lines.join(",");
    while (newStr.endsWith(',')) {
      if (newStr.startsWith('version')) {
        newStr = newStr.substring(11, newStr.length - 1);
      } else {
        newStr = newStr.substring(0, newStr.length - 1);
      }
    }
    newStr = newStr.replace(/{,/g, ':{').trim();
    newStr = "{" + newStr.replace(/,}/g, '}').trim() + "}";
    var correctJson = newStr.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?([\s])?:/g, '"$2": ');
    var number = 0;
    correctJson = correctJson.replace(/order_items/g, function () {
      return "order_item" + ++number;
    });
    var obj = JSON.parse(correctJson);
    var item_keys = Object.keys(obj).filter(value => /^order_item/.test(value));
    var item_info = [];
    for (var i = 0; i < item_keys.length; i++) {
      item_info.push(obj[item_keys[i]]);
    }
    var shipping_info = obj.shipping;
    prepareData(obj, item_info, shipping_info);
  }
}

function prepareData(obj, item_info, shipping_info) {
  var order_level_data = {};
  var item_level_data = [];

  for (i = 0; i < item_info.length; i++) {
    item_data = {};
    item_data['item_id'] = item_info[i].item_id;
    item_data['model_id'] = item_info[i].model_id;
    item_data['total_original_price'] = parseFloat(item_info[i].original_item_price);
    item_data['cogs'] = parseFloat(item_info[i].original_item_price) - parseFloat(item_info[i].seller_product_discount);
    item_data['total_deal_price'] = parseFloat(item_info[i].original_item_price) - parseFloat(item_info[i].seller_product_discount) - parseFloat(item_info[i].shopee_product_discount);
    item_data['seller_voucher_rebate'] = parseFloat(item_info[i].voucher_discount_from_seller);
    item_data['shopee_voucher_rebate'] = parseFloat(item_info[i].voucher_discount_from_shopee);
    item_data['coin_used'] = parseFloat(item_info[i].coin_used_amount);
    item_data['seller_txn_fee'] = parseFloat(item_info[i].seller_txn_fee);
    item_data['comm_fee'] = parseFloat(item_info[i].seller_commission_fee);
    item_level_data.push(item_data);
  }

  order_level_data.buyer_paid_amount = parseFloat(obj['buyer_paid_amount']); //grand_total
  order_level_data.cogs_full_order = sum_item_value(item_level_data, 'cogs');
  order_level_data.comm_fee = sum_item_value(item_level_data, 'comm_fee');
  order_level_data.seller_txn_fee = sum_item_value(item_level_data,'seller_txn_fee') + parseFloat(shipping_info.seller_txn_fee_shipping_portion);
  order_level_data.seller_shipping_rebate = parseFloat(shipping_info.seller_defined_shipping_discount);
  order_level_data.seller_voucher_rebate = sum_item_value(item_level_data, 'seller_voucher_rebate');
  order_level_data.service_fee = parseFloat(obj.service_fee);

  localStorage.setItem('order_level_data', JSON.stringify(order_level_data));
  localStorage.setItem('item_level_data', JSON.stringify(item_level_data));

  writeEscrowDetailDataToPage(order_level_data, item_level_data);
}

function sum_item_value(item_level_data, key) {
  var sum = 0;
  for (i = 0; i < item_level_data.length; i++) {
    sum += item_level_data[i][key];
  }
  return sum;
}

function writeEscrowDetailDataToPage(order_level_data, item_level_data) {
  $('#data-table').show();
  $('#calculator-cases').show();
  document.getElementById('data-table').scrollIntoView();
  var html_order_level = '';

  for (i = 0; i < Object.keys(order_level_data).length; i++) {
    html_order_level += '<tr><td>' + Object.keys(order_level_data)[i] + '</td><td>' + formatter.format(Object.values(order_level_data)[i] / 100000) + '</td></tr>';
  }
  document.getElementById('order_level_data').innerHTML = html_order_level;

  var html_item_level = '<tr>';
  for (j = 0; j < Object.keys(item_level_data[0]).length; j++) {
    html_item_level += '<td>' + Object.keys(item_level_data[0])[j] + '</td>';
  }
  html_item_level += '<td>quantity</td><td>service_fee</td></tr>';

  for (k = 0; k < item_level_data.length; k++) {
    html_item_level += '<tr>';
    for (x = 0; x < 2; x ++) {
      html_item_level += '<td>' + Object.values(item_level_data[k])[x] + '</td>';
    }
    for (l = 2; l < Object.values(item_level_data[k]).length; l++) {
      html_item_level += '<td>' + formatter.format(Object.values(item_level_data[k])[l] / 100000) + '</td>';
    }
    html_item_level += '<td><input type="number" class="quantity required" item_id="' + item_level_data[k].item_id + '"></input></td><td><input type="number" class="service_fee required" item_id="' + item_level_data[k].item_id + '"></input></td>';
    html_item_level += '</tr>';
  }
  document.getElementById('item_level_data').innerHTML = html_item_level;
}

function calculateFullRR() {
  var results = document.getElementsByClassName("result");
  for (i = 0; i < results.length; i++) {
    results[i].innerText = "";
  }

  var order_level_data = JSON.parse(localStorage.getItem('order_level_data'));
  document.getElementById('full-rr-buyer').innerHTML = formatter.format(order_level_data.buyer_paid_amount / 100000);
  document.getElementById('full-rr-seller').innerHTML = formatter.format((order_level_data.cogs_full_order
                                                                                          - order_level_data.seller_txn_fee
                                                                                          - order_level_data.comm_fee
                                                                                          - order_level_data.seller_voucher_rebate
                                                                                          - order_level_data.seller_shipping_rebate
                                                                                          -  order_level_data.service_fee) / 100000);
}

function calculateFullMismatch() {
  var results = document.getElementsByClassName("result");
  for (i = 0; i < results.length; i++) {
    results[i].innerText = "";
  }

  var order_level_data = JSON.parse(localStorage.getItem('order_level_data'));
  document.getElementById('full-mismatch-buyer').innerHTML = formatter.format(order_level_data.buyer_paid_amount / 100000);
  document.getElementById('full-mismatch-seller').innerHTML = formatter.format((order_level_data.cogs_full_order
                                                                                          - order_level_data.seller_txn_fee
                                                                                          - order_level_data.comm_fee
                                                                                          - order_level_data.seller_voucher_rebate
                                                                                          - order_level_data.seller_shipping_rebate
                                                                                          -  order_level_data.service_fee) / 100000);
}


function calculatePartialRR() {
  //clear all previously appended results
  var results = document.getElementsByClassName("result");
  for (i = 0; i < results.length; i++) {
    results[i].innerText = "";
  }

  var failed = checkRequiredInputs();
  if (failed > 0) {
    alert('Please input all values.');
  } else {
    var item_level_data = JSON.parse(localStorage.getItem('item_level_data'));
    var order_level_data = JSON.parse(localStorage.getItem('order_level_data'));
    item_level_data = addInputData(item_level_data);
    var dispute_item_id = parseFloat(document.getElementById('dispute_item_id').value);
    var dispute_model_id = parseFloat(document.getElementById('dispute_model_id').value);
    var dispute_quantity = parseFloat(document.getElementById('dispute_quantity').value);
    var item = item_level_data[item_level_data.findIndex(p => p.item_id == dispute_item_id && p.model_id == dispute_model_id)];
    if (dispute_quantity > item.quantity) {
      alert('Dispute quantity cannot be more than item quantity');
    } else {
      //Buyer = (Deal Price (item) - Seller Voucher (item) - Shopee Voucher (item)- Coins Spent (item)) * Quantity item khiếu nại
      //Khi quantity khiếu nại = quantity của item -> trả về 0
      document.getElementById('partial-rr-buyer').innerHTML = formatter.format((((item.total_deal_price / item.quantity)
                                                                                                  - (item.seller_voucher_rebate / item.quantity)
                                                                                                  - (item.shopee_voucher_rebate / item.quantity)
                                                                                                  - (item.coin_used / item.quantity))
                                                                                                  * (item.quantity - dispute_quantity)) / 100000);
      if (item_level_data.length === 1) {
        //TH1: đh đó chỉ có 1 product ID 1 mặt hàng nhưng có nhiều items.
        //Seller = (Cogs( item) - seller voucher(item) - commission fee (item) - service fee(item) * số lượng thanh toán) - seller defined shipping fee ( nếu có) - (total transaction fee - (transaction fee item * sl khiếu nại))
        document.getElementById('partial-rr-seller').innerHTML = formatter.format(((((item.cogs / item.quantity)
                                                                                                    - (item.seller_voucher_rebate / item.quantity)
                                                                                                    - (item.comm_fee / item.quantity)
                                                                                                    - (item.service_fee / item.quantity))
                                                                                                    * (item.quantity - dispute_quantity))
                                                                                                    - order_level_data.seller_shipping_rebate
                                                                                                    - (order_level_data.seller_txn_fee - (item.seller_txn_fee / item.quantity) * dispute_quantity)) / 100000);
        } else {
        //TH2: đh đó có nhiều product IDs
        //Seller = (Cogs( item) - seller voucher(item) - commission fee (item) - service fee(item) - transaction fee (item)) * số lượng thanh toán
        document.getElementById('partial-rr-seller').innerHTML = formatter.format(((((item.cogs / item.quantity)
                                                                                                    - (item.seller_voucher_rebate / item.quantity)
                                                                                                    - (item.comm_fee / item.quantity)
                                                                                                    - (item.service_fee / item.quantity)
                                                                                                    - (item.seller_txn_fee / item.quantity))
                                                                                                    * (item.quantity - dispute_quantity))) / 100000);
      }
    }
    $('.partial-rr-result').show();
  }
}

function calculatePartial() {
  //clear all previously appended results
  var results = document.getElementsByClassName("result");
  for (i = 0; i < results.length; i++) {
    results[i].innerText = "";
  }

  var failed = checkRequiredInputs();
  if (failed > 0) {
    alert('Please input all values.');
  } else {
    var item_level_data = JSON.parse(localStorage.getItem('item_level_data'));
    var order_level_data = JSON.parse(localStorage.getItem('order_level_data'));
    item_level_data = addInputData(item_level_data);
    var dispute_item_id = parseFloat(document.getElementById('dispute_item_id_partial').value);
    var dispute_quantity = parseFloat(document.getElementById('dispute_quantity_partial').value);
    var item = item_level_data[item_level_data.findIndex(p => p.item_id == dispute_item_id)];
    if (dispute_quantity > item.quantity) {
      alert('Dispute quantity cannot be more than item quantity');
    } else {
      //Refund to buyer
      //Buyer = (Deal Price (item) - Seller Voucher (item) - Shopee Voucher (item)- Coins Spent (item)) * Quantity item khiếu nại
      document.getElementById('partial-buyer').innerHTML = formatter.format((((item.total_deal_price / item.quantity)
                                                                                              - (item.seller_voucher_rebate / item.quantity)
                                                                                              - (item.shopee_voucher_rebate / item.quantity)
                                                                                              - (item.coin_used / item.quantity))
                                                                                              * dispute_quantity) / 100000);
      //Deduct from seller
      if (item_level_data.length === 1) {
        //TH1: đh đó chỉ có 1 product ID 1 mặt hàng nhưng có nhiều items.
        //Seller = COGS (item bị cấn trừ) - Seller Voucher (item bị cấn trừ) - (Total Seller Transaction Fee - Seller Transaction Fee (item không bị cấn trừ)) - Commission Fee (item bị cấn trừ) - Service Fee (item bị cấn trừ)
        document.getElementById('partial-seller').innerHTML = formatter.format(((((item.cogs / item.quantity)
                                                                                                    - (item.seller_voucher_rebate / item.quantity)
                                                                                                    - (item.comm_fee / item.quantity)
                                                                                                    - (item.service_fee / item.quantity))
                                                                                                    * dispute_quantity)
                                                                                                    - (order_level_data.seller_txn_fee - (item.seller_txn_fee / item.quantity) * (item.quantity - dispute_quantity))) / 100000);
        } else {
        //TH2: đh đó có nhiều product IDs
        //Seller = (Cogs( item) - seller voucher(item) - commission fee (item) - service fee(item) - transaction fee (item)) * số lượng thanh toán
        document.getElementById('partial-seller').innerHTML = formatter.format(((((item.cogs / item.quantity)
                                                                                                    - (item.seller_voucher_rebate / item.quantity)
                                                                                                    - (item.comm_fee / item.quantity)
                                                                                                    - (item.service_fee / item.quantity)
                                                                                                    - (item.seller_txn_fee / item.quantity))
                                                                                                    * (item.quantity - dispute_quantity))) / 100000);
      }
    }
  }
}

function calculateFullLost() {
  var results = document.getElementsByClassName("result");
  for (i = 0; i < results.length; i++) {
    results[i].innerText = "";
  }

  var order_level_data = JSON.parse(localStorage.getItem('order_level_data'));
  document.getElementById('full-lost-buyer').innerHTML = formatter.format(order_level_data.buyer_paid_amount / 100000);
  document.getElementById('full-lost-seller').innerHTML = formatter.format((order_level_data.cogs_full_order
                                                                                          - order_level_data.seller_voucher_rebate) / 100000);
}

function checkRequiredInputs() {
  var failed = 0;
  var input_fields = document.getElementsByClassName('required');
  for (i=0; i < input_fields.length; i++) {
    if (!input_fields[i].value) {
      input_fields[i].classList.add("has-error");
      failed += 1;
    }
  }
  $("input.has-error").change(function(){
    $(this).removeClass("has-error");
  });
  return failed;
}

function addInputData(item_level_data) {
  var quantity_inputs = $('.quantity');
  for (i=0; i<quantity_inputs.length; i++){
    var item_id = quantity_inputs[i].getAttribute('item_id');
    var index = item_level_data.findIndex(p => p.item_id == item_id);
    item_level_data[index].quantity = parseFloat(quantity_inputs[i].value);
  }

  var service_fee_inputs = $('.service_fee');
  for(x=0; x<service_fee_inputs.length; x++) {
    var item_id = service_fee_inputs[x].getAttribute('item_id');
    var index = item_level_data.findIndex(p => p.item_id == item_id);
    item_level_data[index].service_fee = parseFloat(service_fee_inputs[x].value);
  }
  return item_level_data;
}




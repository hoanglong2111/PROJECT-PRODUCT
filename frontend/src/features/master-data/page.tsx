import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconBuilding,
  IconFileCode,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState, useEffect } from 'react';

import { useAuth } from '@shared/auth/useAuth';
import {
  getPartners,
  savePartners,
  getPorts,
  savePorts,
  getItems,
  saveItems,
} from '@shared/api/masterDataService';
import type { PartnerRecord, PortRecord, ItemRecord } from './mockData';

export function MasterData() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<string>('partners');

  // Master Data State loaded from persistent service
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [ports, setPorts] = useState<PortRecord[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);

  useEffect(() => {
    setPartners(getPartners());
    setPorts(getPorts());
    setItems(getItems());
  }, []);

  // Search states
  const [partnerSearch, setPartnerSearch] = useState('');
  const [portSearch, setPortSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  // Modals state
  const [partnerModalOpened, partnerModalHandlers] = useDisclosure(false);
  const [portModalOpened, portModalHandlers] = useDisclosure(false);
  const [itemModalOpened, itemModalHandlers] = useDisclosure(false);

  // Edit states
  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null);
  const [editingPort, setEditingPort] = useState<PortRecord | null>(null);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);

  // Partner Form State
  const [partCode, setPartCode] = useState('');
  const [partName, setPartName] = useState('');
  const [partType, setPartType] = useState<string>('SUPPLIER');
  const [partTax, setPartTax] = useState('');
  const [partAddress, setPartAddress] = useState('');
  const [partEmail, setPartEmail] = useState('');

  // Port Form State
  const [portCode, setPortCode] = useState('');
  const [portName, setPortName] = useState('');
  const [portCountry, setPortCountry] = useState('');
  const [portType, setPortType] = useState<string>('SEA');

  // Item Form State
  const [itemCode, setItemCode] = useState('');
  const [itemGroup, setItemGroup] = useState('');
  const [itemSourceReference, setItemSourceReference] = useState('');
  const [itemDeclarationType, setItemDeclarationType] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemHs, setItemHs] = useState('');
  const [itemDuty, setItemDuty] = useState<number | string>('0');
  const [itemVat, setItemVat] = useState<number | string>('10');
  const [itemTariffCode, setItemTariffCode] = useState('');
  const [itemClassificationCode, setItemClassificationCode] = useState('');
  const [itemCoNote, setItemCoNote] = useState('');
  const [itemTaxNote, setItemTaxNote] = useState('');

  // Filtered lists
  const filteredPartners = useMemo(() => {
    const q = partnerSearch.toLowerCase().trim();
    return partners.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.tax_code.includes(q)
    );
  }, [partners, partnerSearch]);

  const filteredPorts = useMemo(() => {
    const q = portSearch.toLowerCase().trim();
    return ports.filter(
      (p) =>
        p.port_code.toLowerCase().includes(q) ||
        p.port_name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q)
    );
  }, [ports, portSearch]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.toLowerCase().trim();
    return items.filter(
      (i) =>
        i.item_code.toLowerCase().includes(q) ||
        i.item_name.toLowerCase().includes(q) ||
        i.hs_code.includes(q) ||
        (i.item_group || '').toLowerCase().includes(q) ||
        (i.source_reference || '').toLowerCase().includes(q) ||
        (i.declaration_type || '').toLowerCase().includes(q) ||
        (i.tariff_code || '').toLowerCase().includes(q) ||
        (i.classification_code || '').toLowerCase().includes(q) ||
        (i.co_note || '').toLowerCase().includes(q) ||
        (i.tax_note || '').toLowerCase().includes(q)
    );
  }, [items, itemSearch]);

  // Open forms for Add
  const openAddPartner = () => {
    setEditingPartner(null);
    setPartCode('');
    setPartName('');
    setPartType('SUPPLIER');
    setPartTax('');
    setPartAddress('');
    setPartEmail('');
    partnerModalHandlers.open();
  };

  const openAddPort = () => {
    setEditingPort(null);
    setPortCode('');
    setPortName('');
    setPortCountry('');
    setPortType('SEA');
    portModalHandlers.open();
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemCode('');
    setItemGroup('');
    setItemSourceReference('');
    setItemDeclarationType('');
    setItemName('');
    setItemHs('');
    setItemDuty('0');
    setItemVat('10');
    setItemTariffCode('');
    setItemClassificationCode('');
    setItemCoNote('');
    setItemTaxNote('');
    itemModalHandlers.open();
  };

  // Open forms for Edit
  const openEditPartner = (p: PartnerRecord) => {
    setEditingPartner(p);
    setPartCode(p.code);
    setPartName(p.name);
    setPartType(p.type);
    setPartTax(p.tax_code);
    setPartAddress(p.address);
    setPartEmail(p.contact_email);
    partnerModalHandlers.open();
  };

  const openEditPort = (p: PortRecord) => {
    setEditingPort(p);
    setPortCode(p.port_code);
    setPortName(p.port_name);
    setPortCountry(p.country);
    setPortType(p.type);
    portModalHandlers.open();
  };

  const openEditItem = (i: ItemRecord) => {
    setEditingItem(i);
    setItemCode(i.item_code);
    setItemGroup(i.item_group || '');
    setItemSourceReference(i.source_reference || '');
    setItemDeclarationType(i.declaration_type || '');
    setItemName(i.item_name);
    setItemHs(i.hs_code);
    setItemDuty(String(i.duty_rate));
    setItemVat(String(i.vat_rate));
    setItemTariffCode(i.tariff_code || '');
    setItemClassificationCode(i.classification_code || '');
    setItemCoNote(i.co_note || '');
    setItemTaxNote(i.tax_note || '');
    itemModalHandlers.open();
  };

  // Save/Update actions
  const handleSavePartner = () => {
    if (!partCode || !partName) return;
    let updated: PartnerRecord[];
    if (editingPartner) {
      updated = partners.map((p) =>
        p.id === editingPartner.id
          ? {
              ...p,
              code: partCode,
              name: partName,
              type: partType as PartnerRecord['type'],
              tax_code: partTax,
              address: partAddress,
              contact_email: partEmail,
            }
          : p
      );
    } else {
      const newPart: PartnerRecord = {
        id: `part-${Date.now()}`,
        code: partCode,
        name: partName,
        type: partType as PartnerRecord['type'],
        tax_code: partTax,
        address: partAddress,
        contact_email: partEmail,
      };
      updated = [...partners, newPart];
    }
    setPartners(updated);
    savePartners(updated);
    partnerModalHandlers.close();
  };

  const handleSavePort = () => {
    if (!portCode || !portName) return;
    let updated: PortRecord[];
    if (editingPort) {
      updated = ports.map((p) =>
        p.id === editingPort.id
          ? {
              ...p,
              port_code: portCode.toUpperCase(),
              port_name: portName,
              country: portCountry,
              type: portType as PortRecord['type'],
            }
          : p
      );
    } else {
      const newPort: PortRecord = {
        id: `port-${Date.now()}`,
        port_code: portCode.toUpperCase(),
        port_name: portName,
        country: portCountry,
        type: portType as PortRecord['type'],
      };
      updated = [...ports, newPort];
    }
    setPorts(updated);
    savePorts(updated);
    portModalHandlers.close();
  };

  const handleSaveItem = () => {
    if (!itemCode || !itemName || !itemHs) return;
    let updated: ItemRecord[];
    if (editingItem) {
      updated = items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              item_code: itemCode,
              item_group: itemGroup,
              source_reference: itemSourceReference,
              declaration_type: itemDeclarationType,
              item_name: itemName,
              hs_code: itemHs,
              duty_rate: Number(itemDuty) || 0,
              vat_rate: Number(itemVat) || 0,
              tariff_code: itemTariffCode,
              classification_code: itemClassificationCode,
              co_note: itemCoNote,
              tax_note: itemTaxNote,
            }
          : i
      );
    } else {
      const newItem: ItemRecord = {
        id: `item-${Date.now()}`,
        item_code: itemCode,
        item_group: itemGroup,
        source_reference: itemSourceReference,
        declaration_type: itemDeclarationType,
        item_name: itemName,
        hs_code: itemHs,
        duty_rate: Number(itemDuty) || 0,
        vat_rate: Number(itemVat) || 0,
        tariff_code: itemTariffCode,
        classification_code: itemClassificationCode,
        co_note: itemCoNote,
        tax_note: itemTaxNote,
      };
      updated = [...items, newItem];
    }
    setItems(updated);
    saveItems(updated);
    itemModalHandlers.close();
  };

  // Delete actions
  const handleDeletePartner = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đối tác này?')) return;
    const updated = partners.filter((p) => p.id !== id);
    setPartners(updated);
    savePartners(updated);
  };

  const handleDeletePort = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cảng này?')) return;
    const updated = ports.filter((p) => p.id !== id);
    setPorts(updated);
    savePorts(updated);
  };

  const handleDeleteItem = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    saveItems(updated);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={1}>Quản lý Dữ liệu gốc (Master Data)</Title>
          <Text c="dimmed" mt={4}>
            Định nghĩa thông tin Đối tác (Supplier, Carrier), Danh sách Cảng biển/Sân bay và biểu thuế hải quan HS Code.
          </Text>
        </div>
        {!isAdmin && (
          <Badge color="blue" variant="filled" size="lg" leftSection={<IconAlertCircle size={14} />}>
            Chế độ Xem (Read-only)
          </Badge>
        )}
      </Group>

      {!isAdmin && (
        <Alert color="blue" variant="light" title="Quyền truy cập hạn chế" icon={<IconAlertCircle size={18} />}>
          Bạn đang đăng nhập dưới vai trò <strong>{user?.role}</strong>. Chỉ người dùng có vai trò <strong>ADMIN</strong> mới được quyền thêm, sửa hoặc xóa thông tin Dữ liệu gốc.
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'partners')}>
        <Tabs.List>
          <Tabs.Tab value="partners" leftSection={<IconBuilding size={16} />}>
            Đối tác (Partners)
          </Tabs.Tab>
          <Tabs.Tab value="ports" leftSection={<IconMapPin size={16} />}>
            Cảng & Cửa khẩu (Ports)
          </Tabs.Tab>
          <Tabs.Tab value="items" leftSection={<IconFileCode size={16} />}>
            HS Code & Tariff Matrix
          </Tabs.Tab>
        </Tabs.List>

        {/* Partners Tab */}
        <Tabs.Panel value="partners" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <TextInput
                placeholder="Tìm kiếm đối tác..."
                leftSection={<IconSearch size={16} />}
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.currentTarget.value)}
                style={{ width: 300 }}
              />
              {isAdmin && (
                <Button onClick={openAddPartner} leftSection={<IconPlus size={16} />}>
                  Thêm Đối tác
                </Button>
              )}
            </Group>

            <Paper withBorder p={0}>
              <ScrollArea>
                <Table verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Mã đối tác</Table.Th>
                      <Table.Th>Tên đối tác</Table.Th>
                      <Table.Th>Loại hình</Table.Th>
                      <Table.Th>MST</Table.Th>
                      <Table.Th>Địa chỉ</Table.Th>
                      <Table.Th>Email liên hệ</Table.Th>
                      {isAdmin && <Table.Th style={{ width: 100 }}>Thao tác</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredPartners.map((p) => (
                      <Table.Tr key={p.id}>
                        <Table.Td fw={700}>{p.code}</Table.Td>
                        <Table.Td fw={600}>{p.name}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              p.type === 'SUPPLIER'
                                ? 'blue'
                                : p.type === 'CARRIER'
                                  ? 'orange'
                                  : 'teal'
                            }
                            variant="light"
                          >
                            {p.type}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{p.tax_code || '-'}</Table.Td>
                        <Table.Td>{p.address || '-'}</Table.Td>
                        <Table.Td>{p.contact_email || '-'}</Table.Td>
                        {isAdmin && (
                          <Table.Td>
                            <Group gap={4} wrap="nowrap">
                              <ActionIcon variant="subtle" color="blue" onClick={() => openEditPartner(p)}>
                                <IconPencil size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => handleDeletePartner(p.id)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* Ports Tab */}
        <Tabs.Panel value="ports" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <TextInput
                placeholder="Tìm kiếm cảng biển/sân bay..."
                leftSection={<IconSearch size={16} />}
                value={portSearch}
                onChange={(e) => setPortSearch(e.currentTarget.value)}
                style={{ width: 300 }}
              />
              {isAdmin && (
                <Button onClick={openAddPort} leftSection={<IconPlus size={16} />}>
                  Thêm Cảng / Cửa khẩu
                </Button>
              )}
            </Group>

            <Paper withBorder p={0}>
              <ScrollArea>
                <Table verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Mã cảng</Table.Th>
                      <Table.Th>Tên cảng</Table.Th>
                      <Table.Th>Loại hình</Table.Th>
                      <Table.Th>Quốc gia</Table.Th>
                      {isAdmin && <Table.Th style={{ width: 100 }}>Thao tác</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredPorts.map((p) => (
                      <Table.Tr key={p.id}>
                        <Table.Td fw={700}>{p.port_code}</Table.Td>
                        <Table.Td fw={600}>{p.port_name}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              p.type === 'SEA' ? 'cyan' : p.type === 'AIR' ? 'indigo' : 'green'
                            }
                            variant="light"
                          >
                            {p.type}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{p.country}</Table.Td>
                        {isAdmin && (
                          <Table.Td>
                            <Group gap={4} wrap="nowrap">
                              <ActionIcon variant="subtle" color="blue" onClick={() => openEditPort(p)}>
                                <IconPencil size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => handleDeletePort(p.id)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* HS Codes Tab */}
        <Tabs.Panel value="items" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <TextInput
                placeholder="Tìm kiếm sản phẩm, HS Code..."
                leftSection={<IconSearch size={16} />}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.currentTarget.value)}
                style={{ width: 300 }}
              />
              {isAdmin && (
                <Button onClick={openAddItem} leftSection={<IconPlus size={16} />}>
                  Khai báo mã HS Code / Thuế
                </Button>
              )}
            </Group>

            <Paper withBorder p={0}>
              <ScrollArea>
                <Table miw={1680} verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Nhóm/Mã định danh</Table.Th>
                      <Table.Th>GRPO / Hợp đồng</Table.Th>
                      <Table.Th>Loại hình / PTVC</Table.Th>
                      <Table.Th>Mã linh kiện</Table.Th>
                      <Table.Th>Tên hàng khai báo</Table.Th>
                      <Table.Th>Mã HS</Table.Th>
                      <Table.Th>Thuế NK</Table.Th>
                      <Table.Th>VAT</Table.Th>
                      <Table.Th>Mã biểu thuế</Table.Th>
                      <Table.Th>Mã phân loại</Table.Th>
                      <Table.Th>C/O</Table.Th>
                      <Table.Th>Ghi chú</Table.Th>
                      {isAdmin && <Table.Th style={{ width: 100 }}>Thao tác</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredItems.map((i) => (
                      <Table.Tr key={i.id}>
                        <Table.Td>{i.item_group || '-'}</Table.Td>
                        <Table.Td>{i.source_reference || '-'}</Table.Td>
                        <Table.Td>{i.declaration_type || '-'}</Table.Td>
                        <Table.Td fw={700}>{i.item_code}</Table.Td>
                        <Table.Td className="table-cell-truncate" style={{ maxWidth: '24rem' }}>
                          <Text size="sm" fw={600} lineClamp={2} title={i.item_name}>
                            {i.item_name}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="gray" variant="filled">
                            {i.hs_code}
                          </Badge>
                        </Table.Td>
                        <Table.Td fw={700} c="red">
                          {i.duty_rate}%
                        </Table.Td>
                        <Table.Td>{i.vat_rate}%</Table.Td>
                        <Table.Td>{i.tariff_code || '-'}</Table.Td>
                        <Table.Td>{i.classification_code || '-'}</Table.Td>
                        <Table.Td>{i.co_note || '-'}</Table.Td>
                        <Table.Td>{i.tax_note || '-'}</Table.Td>
                        {isAdmin && (
                          <Table.Td>
                            <Group gap={4} wrap="nowrap">
                              <ActionIcon variant="subtle" color="blue" onClick={() => openEditItem(i)}>
                                <IconPencil size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteItem(i.id)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Add/Edit Partner Modal */}
      <Modal
        opened={partnerModalOpened}
        onClose={partnerModalHandlers.close}
        title={editingPartner ? 'Cập nhật thông tin Đối tác' : 'Thêm Đối tác Mới'}
      >
        <Stack gap="md">
          <TextInput
            label="Mã đối tác"
            placeholder="Ví dụ: SUP-LGE"
            value={partCode}
            onChange={(e) => setPartCode(e.currentTarget.value)}
            required
            disabled={Boolean(editingPartner)}
          />
          <TextInput
            label="Tên đối tác"
            placeholder="Ví dụ: LG Electronics Corp"
            value={partName}
            onChange={(e) => setPartName(e.currentTarget.value)}
            required
          />
          <Select
            label="Phân loại đối tác"
            value={partType}
            onChange={(val) => setPartType(val || 'SUPPLIER')}
            data={[
              { label: 'SUPPLIER (Nhà cung cấp)', value: 'SUPPLIER' },
              { label: 'CARRIER (Nhà xe nội địa)', value: 'CARRIER' },
              { label: 'FORWARDER (Đại lý vận chuyển)', value: 'FORWARDER' },
            ]}
          />
          <TextInput
            label="Mã số thuế"
            placeholder="MST doanh nghiệp"
            value={partTax}
            onChange={(e) => setPartTax(e.currentTarget.value)}
          />
          <TextInput
            label="Địa chỉ văn phòng"
            placeholder="Địa chỉ trụ sở chính"
            value={partAddress}
            onChange={(e) => setPartAddress(e.currentTarget.value)}
          />
          <TextInput
            label="Email liên hệ nghiệp vụ"
            placeholder="operations@company.com"
            value={partEmail}
            onChange={(e) => setPartEmail(e.currentTarget.value)}
          />
          <Button onClick={handleSavePartner} fullWidth mt="md">
            Lưu thông tin Đối tác
          </Button>
        </Stack>
      </Modal>

      {/* Add/Edit Port Modal */}
      <Modal
        opened={portModalOpened}
        onClose={portModalHandlers.close}
        title={editingPort ? 'Cập nhật thông tin Cảng / Cửa khẩu' : 'Thêm Cảng / Cửa khẩu mới'}
      >
        <Stack gap="md">
          <TextInput
            label="Mã cảng hàng không/hải quan (UN/LOCODE)"
            placeholder="Ví dụ: VNSGN, CNSHA, SGN"
            value={portCode}
            onChange={(e) => setPortCode(e.currentTarget.value)}
            required
            disabled={Boolean(editingPort)}
          />
          <TextInput
            label="Tên cảng/cửa khẩu"
            placeholder="Ví dụ: Cát Lái Sea Port"
            value={portName}
            onChange={(e) => setPortName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Quốc gia"
            placeholder="Ví dụ: Vietnam, China, Korea"
            value={portCountry}
            onChange={(e) => setPortCountry(e.currentTarget.value)}
            required
          />
          <Select
            label="Loại hình cảng"
            value={portType}
            onChange={(val) => setPortType(val || 'SEA')}
            data={[
              { label: 'SEA (Cảng biển)', value: 'SEA' },
              { label: 'AIR (Sân bay)', value: 'AIR' },
              { label: 'BORDER (Cửa khẩu đường bộ)', value: 'BORDER' },
            ]}
          />
          <Button onClick={handleSavePort} fullWidth mt="md">
            Lưu thông tin Cảng
          </Button>
        </Stack>
      </Modal>

      {/* Add/Edit Item Modal */}
      <Modal
        opened={itemModalOpened}
        onClose={itemModalHandlers.close}
        size="lg"
        title={editingItem ? 'Cập nhật master item / HS Code' : 'Khai báo master item / HS Code'}
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Nhóm hàng / Mã định danh"
              placeholder="Ví dụ: Động cơ dầu SDEC / 850440"
              value={itemGroup}
              onChange={(e) => setItemGroup(e.currentTarget.value)}
            />
            <TextInput
              label="Mã đơn hàng / GRPO / Hợp đồng"
              placeholder="Ví dụ: KBI-SDEC-2512"
              value={itemSourceReference}
              onChange={(e) => setItemSourceReference(e.currentTarget.value)}
            />
            <TextInput
              label="Loại hình / Phương thức vận chuyển"
              placeholder="Ví dụ: A12, E31, Sea, Air"
              value={itemDeclarationType}
              onChange={(e) => setItemDeclarationType(e.currentTarget.value)}
            />
            <TextInput
              label="Mã vật tư linh kiện"
              placeholder="Ví dụ: ITEM-85030090-2"
              value={itemCode}
              onChange={(e) => setItemCode(e.currentTarget.value)}
              required
              disabled={Boolean(editingItem)}
            />
          </SimpleGrid>
          <TextInput
            label="Tên hàng khai báo"
            placeholder="Ví dụ: Phụ tùng dùng cho tổ máy phát điện..."
            value={itemName}
            onChange={(e) => setItemName(e.currentTarget.value)}
            required
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput
              label="Mã HS"
              placeholder="Ví dụ: 85030090"
              value={itemHs}
              onChange={(e) => setItemHs(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Thuế suất nhập khẩu (%)"
              type="number"
              value={itemDuty}
              onChange={(e) => setItemDuty(e.currentTarget.value)}
            />
            <TextInput
              label="Thuế suất GTGT (%)"
              type="number"
              value={itemVat}
              onChange={(e) => setItemVat(e.currentTarget.value)}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Mã biểu thuế"
              placeholder="Ví dụ: VB245, VK120"
              value={itemTariffCode}
              onChange={(e) => setItemTariffCode(e.currentTarget.value)}
            />
            <TextInput
              label="Mã phân loại bổ sung"
              placeholder="Ví dụ: B05, B01, A12"
              value={itemClassificationCode}
              onChange={(e) => setItemClassificationCode(e.currentTarget.value)}
            />
            <TextInput
              label="Ghi chú C/O"
              placeholder="Ví dụ: CO FORM E = 0%"
              value={itemCoNote}
              onChange={(e) => setItemCoNote(e.currentTarget.value)}
            />
            <TextInput
              label="Ghi chú khác"
              placeholder="Ví dụ: Thuế suất: C"
              value={itemTaxNote}
              onChange={(e) => setItemTaxNote(e.currentTarget.value)}
            />
          </SimpleGrid>
          <Button onClick={handleSaveItem} fullWidth mt="md">
            Lưu thông tin master item
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
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
import { useI18n } from '@shared/i18n';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
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
  const { t } = useI18n();
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

  const {
    visibleItems,
    page,
    setPage,
    pageCount,
    pageStart,
    pageEnd,
  } = useListPagination(filteredItems, [itemSearch]);

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
    if (!window.confirm(t('masterData.confirmDeletePartner'))) return;
    const updated = partners.filter((p) => p.id !== id);
    setPartners(updated);
    savePartners(updated);
  };

  const handleDeletePort = (id: string) => {
    if (!window.confirm(t('masterData.confirmDeletePort'))) return;
    const updated = ports.filter((p) => p.id !== id);
    setPorts(updated);
    savePorts(updated);
  };

  const handleDeleteItem = (id: string) => {
    if (!window.confirm(t('masterData.confirmDeleteItem'))) return;
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    saveItems(updated);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={1}>{t('masterData.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('masterData.subtitle')}
          </Text>
        </div>
        {!isAdmin && (
          <Badge color="blue" variant="filled" size="lg" leftSection={<IconAlertCircle size={14} />}>
            {t('masterData.readOnlyBadge')}
          </Badge>
        )}
      </Group>

      {!isAdmin && (
        <Alert color="blue" variant="light" title={t('masterData.readOnlyBadge')} icon={<IconAlertCircle size={18} />}>
          {t('masterData.readOnlyAlert')}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'partners')}>
        <Tabs.List>
          <Tabs.Tab value="partners" leftSection={<IconBuilding size={16} />}>
            {t('masterData.tabPartners')}
          </Tabs.Tab>
          <Tabs.Tab value="ports" leftSection={<IconMapPin size={16} />}>
            {t('masterData.tabPorts')}
          </Tabs.Tab>
          <Tabs.Tab value="items" leftSection={<IconFileCode size={16} />}>
            {t('masterData.tabHsCode')}
          </Tabs.Tab>
        </Tabs.List>

        {/* Partners Tab */}
        <Tabs.Panel value="partners" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <TextInput
                placeholder={t('masterData.searchPartners')}
                leftSection={<IconSearch size={16} />}
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.currentTarget.value)}
                style={{ width: 300 }}
              />
              {isAdmin && (
                <Button onClick={openAddPartner} leftSection={<IconPlus size={16} />}>
                  {t('masterData.addPartner')}
                </Button>
              )}
            </Group>

            <Paper withBorder p={0}>
              <ScrollArea>
                <Table verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('masterData.partnerCode')}</Table.Th>
                      <Table.Th>{t('masterData.partnerName')}</Table.Th>
                      <Table.Th>{t('masterData.partnerType')}</Table.Th>
                      <Table.Th>{t('masterData.taxCode')}</Table.Th>
                      <Table.Th>{t('masterData.address')}</Table.Th>
                      <Table.Th>{t('masterData.contactEmail')}</Table.Th>
                      {isAdmin && <Table.Th style={{ width: 100 }}>{t('masterData.actions')}</Table.Th>}
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
                placeholder={t('masterData.searchPorts')}
                leftSection={<IconSearch size={16} />}
                value={portSearch}
                onChange={(e) => setPortSearch(e.currentTarget.value)}
                style={{ width: 300 }}
              />
              {isAdmin && (
                <Button onClick={openAddPort} leftSection={<IconPlus size={16} />}>
                  {t('masterData.addPort')}
                </Button>
              )}
            </Group>

            <Paper withBorder p={0}>
              <ScrollArea>
                <Table verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('masterData.portCode')}</Table.Th>
                      <Table.Th>{t('masterData.portName')}</Table.Th>
                      <Table.Th>{t('masterData.portType')}</Table.Th>
                      <Table.Th>{t('masterData.country')}</Table.Th>
                      {isAdmin && <Table.Th style={{ width: 100 }}>{t('masterData.actions')}</Table.Th>}
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
                placeholder={t('masterData.searchItems')}
                leftSection={<IconSearch size={16} />}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.currentTarget.value)}
                style={{ width: 300 }}
              />
              {isAdmin && (
                <Button onClick={openAddItem} leftSection={<IconPlus size={16} />}>
                  {t('masterData.addItem')}
                </Button>
              )}
            </Group>

            <Paper withBorder p={0}>
              <ScrollArea>
                <Table miw={1680} verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('masterData.itemGroup')}</Table.Th>
                      <Table.Th>{t('masterData.sourceReference')}</Table.Th>
                      <Table.Th>{t('masterData.declarationType')}</Table.Th>
                      <Table.Th>{t('masterData.itemCode')}</Table.Th>
                      <Table.Th>{t('masterData.itemName')}</Table.Th>
                      <Table.Th>{t('masterData.hsCode')}</Table.Th>
                      <Table.Th>{t('masterData.dutyRate')}</Table.Th>
                      <Table.Th>{t('masterData.vatRate')}</Table.Th>
                      <Table.Th>{t('masterData.tariffCode')}</Table.Th>
                      <Table.Th>{t('masterData.classificationCode')}</Table.Th>
                      <Table.Th>{t('masterData.coNote')}</Table.Th>
                      <Table.Th>{t('masterData.taxNote')}</Table.Th>
                      {isAdmin && <Table.Th style={{ width: 100 }}>{t('masterData.actions')}</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {visibleItems.map((i) => (
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
              <ListPagination
                page={page}
                pageCount={pageCount}
                pageEnd={pageEnd}
                pageStart={pageStart}
                setPage={setPage}
                total={filteredItems.length}
              />
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Add/Edit Partner Modal */}
      <Modal
        opened={partnerModalOpened}
        onClose={partnerModalHandlers.close}
        title={editingPartner ? t('masterData.editPartner') : t('masterData.createPartner')}
      >
        <Stack gap="md">
          <TextInput
            label={t('masterData.partnerCode')}
            placeholder={t('masterData.partnerCodePlaceholder')}
            value={partCode}
            onChange={(e) => setPartCode(e.currentTarget.value)}
            required
            disabled={Boolean(editingPartner)}
          />
          <TextInput
            label={t('masterData.partnerName')}
            placeholder={t('masterData.partnerNamePlaceholder')}
            value={partName}
            onChange={(e) => setPartName(e.currentTarget.value)}
            required
          />
          <Select
            label={t('masterData.partnerType')}
            value={partType}
            onChange={(val) => setPartType(val || 'SUPPLIER')}
            data={[
              { label: t('masterData.supplierType'), value: 'SUPPLIER' },
              { label: t('masterData.carrierType'), value: 'CARRIER' },
              { label: t('masterData.forwarderType'), value: 'FORWARDER' },
            ]}
          />
          <TextInput
            label={t('masterData.taxCode')}
            placeholder={t('masterData.taxCodePlaceholder')}
            value={partTax}
            onChange={(e) => setPartTax(e.currentTarget.value)}
          />
          <TextInput
            label={t('masterData.address')}
            placeholder={t('masterData.addressPlaceholder')}
            value={partAddress}
            onChange={(e) => setPartAddress(e.currentTarget.value)}
          />
          <TextInput
            label={t('masterData.contactEmail')}
            placeholder={t('masterData.emailPlaceholder')}
            value={partEmail}
            onChange={(e) => setPartEmail(e.currentTarget.value)}
          />
          <Button onClick={handleSavePartner} fullWidth mt="md">
            {t('masterData.savePartner')}
          </Button>
        </Stack>
      </Modal>

      {/* Add/Edit Port Modal */}
      <Modal
        opened={portModalOpened}
        onClose={portModalHandlers.close}
        title={editingPort ? t('masterData.editPort') : t('masterData.createPort')}
      >
        <Stack gap="md">
          <TextInput
            label={t('masterData.portCodeLabel')}
            placeholder={t('masterData.portCodePlaceholder')}
            value={portCode}
            onChange={(e) => setPortCode(e.currentTarget.value)}
            required
            disabled={Boolean(editingPort)}
          />
          <TextInput
            label={t('masterData.portName')}
            placeholder={t('masterData.portNamePlaceholder')}
            value={portName}
            onChange={(e) => setPortName(e.currentTarget.value)}
            required
          />
          <TextInput
            label={t('masterData.country')}
            placeholder={t('masterData.countryPlaceholder')}
            value={portCountry}
            onChange={(e) => setPortCountry(e.currentTarget.value)}
            required
          />
          <Select
            label={t('masterData.portType')}
            value={portType}
            onChange={(val) => setPortType(val || 'SEA')}
            data={[
              { label: t('masterData.seaPortLabel'), value: 'SEA' },
              { label: t('masterData.airPortLabel'), value: 'AIR' },
              { label: t('masterData.borderPortLabel'), value: 'BORDER' },
            ]}
          />
          <Button onClick={handleSavePort} fullWidth mt="md">
            {t('masterData.savePort')}
          </Button>
        </Stack>
      </Modal>

      {/* Add/Edit Item Modal */}
      <Modal
        opened={itemModalOpened}
        onClose={itemModalHandlers.close}
        size="lg"
        title={editingItem ? t('masterData.editItem') : t('masterData.createItem')}
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t('masterData.itemGroupLabel')}
              placeholder={t('masterData.itemGroupPlaceholder')}
              value={itemGroup}
              onChange={(e) => setItemGroup(e.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.sourceRefLabel')}
              placeholder={t('masterData.sourceRefPlaceholder')}
              value={itemSourceReference}
              onChange={(e) => setItemSourceReference(e.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.declTypeLabel')}
              placeholder={t('masterData.declTypePlaceholder')}
              value={itemDeclarationType}
              onChange={(e) => setItemDeclarationType(e.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.itemCodeLabel')}
              placeholder={t('masterData.itemCodePlaceholder')}
              value={itemCode}
              onChange={(e) => setItemCode(e.currentTarget.value)}
              required
              disabled={Boolean(editingItem)}
            />
          </SimpleGrid>
          <TextInput
            label={t('masterData.itemNameLabel')}
            placeholder={t('masterData.itemNamePlaceholder')}
            value={itemName}
            onChange={(e) => setItemName(e.currentTarget.value)}
            required
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput
              label={t('masterData.hsCode')}
              placeholder={t('masterData.hsCodePlaceholder')}
              value={itemHs}
              onChange={(e) => setItemHs(e.currentTarget.value)}
              required
            />
            <TextInput
              label={t('masterData.dutyRateLabel')}
              type="number"
              value={itemDuty}
              onChange={(e) => setItemDuty(e.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.vatRateLabel')}
              type="number"
              value={itemVat}
              onChange={(e) => setItemVat(e.currentTarget.value)}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t('masterData.tariffCode')}
              placeholder={t('masterData.tariffCodePlaceholder')}
              value={itemTariffCode}
              onChange={(e) => setItemTariffCode(e.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.classificationCode')}
              placeholder={t('masterData.classificationPlaceholder')}
              value={itemClassificationCode}
              onChange={(e) => setItemClassificationCode(e.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.coNote')}
              placeholder={t('masterData.coNotePlaceholder')}
              value={itemCoNote}
              onChange={(e) => setItemCoNote(e.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.taxNote')}
              placeholder={t('masterData.taxNotePlaceholder')}
              value={itemTaxNote}
              onChange={(e) => setItemTaxNote(e.currentTarget.value)}
            />
          </SimpleGrid>
          <Button onClick={handleSaveItem} fullWidth mt="md">
            {t('masterData.saveItem')}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
